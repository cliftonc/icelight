/**
 * Reseed steps: configuration lookup, cache purge and row counting.
 * Pipeline, sink, catalog and R2 operations reuse the launch/teardown steps.
 */

import { join } from 'path';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import {
  loadEnvFile,
  getWorkersPath,
  readWranglerConfig,
  runQuietAsync,
  runCommandWithOutputAsync,
  findBasinResourceId,
  fetchSubdomainFromApi,
  constructWorkerUrl,
} from '../setup/core/index.js';
import { formatCommandError } from '../setup/core/wrangler.js';
import { checkWranglerAuth } from '../setup/steps/auth.js';
import { getWorkerNames } from '../setup/steps/config.js';
import { loadTeardownConfig } from '../teardown/steps/config.js';
import type { Config } from '../teardown/core/types.js';

/** Must match the sink created by `pnpm launch` (setup/steps/infrastructure.ts) */
export const NAMESPACE = 'analytics';
export const TABLE = 'events';
/** Key prefix used by the query API's drizzle-cube KV cache (src/index.ts) */
const CACHE_KEY_PREFIX = 'drizzle-cube:';

export interface ReseedOptions {
  days: number;
  confirmed: boolean;
  resetDashboard: boolean;
}

/** Everything the reseed needs, resolved before asking for confirmation */
export interface ReseedPlan {
  projectName: string;
  config: Config;
  apiToken: string;
  accountId: string;
  streamId: string;
  sinkId: string | null;
  pipelineId: string | null;
  /** Set when the ingest worker is bound to a different stream than config.streamName */
  streamMismatch: string | null;
  kvNamespaceId: string | null;
  ingestUrl: string;
  queryUrl: string | null;
}

/**
 * Check auth, read config the way launch/teardown do and look up the
 * Basin Pipelines resources. Throws with a user-facing message.
 */
export async function prepareReseed(report: (message: string) => void): Promise<ReseedPlan> {
  const { projectName, config, apiToken } = loadTeardownConfig();
  if (!apiToken) {
    throw new Error('No ICELIGHT_API_TOKEN in .env - run `pnpm launch` first');
  }

  report('Checking authentication...');
  const auth = await checkWranglerAuth();
  if (!auth.authenticated || !auth.accountId) {
    throw new Error('Not logged in to Cloudflare (or no account ID) - run `wrangler login`');
  }
  const accountId = auth.accountId;

  const workerNames = getWorkerNames(projectName);
  const workersPath = getWorkersPath();
  const queryLocal = readWranglerConfig(join(workersPath, 'query-api', 'wrangler.local.jsonc'));
  const ingestLocal = readWranglerConfig(join(workersPath, 'event-ingest', 'wrangler.local.jsonc'));
  const kvNamespaceId =
    (queryLocal?.kv_namespaces as Array<{ binding: string; id: string }> | undefined)?.find(
      (ns) => ns.binding === 'CACHE'
    )?.id ?? null;
  const boundStreamId = (ingestLocal?.pipelines as Array<{ stream?: string }> | undefined)?.[0]?.stream;

  report('Looking up Basin Pipelines resources...');
  const [streamId, sinkId, pipelineId] = await Promise.all([
    findBasinResourceId('stream', config.streamName),
    findBasinResourceId('sink', config.sinkName),
    findBasinResourceId('pipeline', config.pipelineName),
  ]);
  if (!streamId) {
    throw new Error(`Stream ${config.streamName} not found - run \`pnpm launch\` instead`);
  }

  report('Resolving worker URLs...');
  const subdomain = await fetchSubdomainFromApi(accountId, apiToken);
  const ingestUrl =
    process.env.INGEST_API_URL || constructWorkerUrl(workerNames.eventIngest, subdomain ?? undefined);
  if (!ingestUrl) {
    throw new Error('Could not work out the ingest worker URL - set INGEST_API_URL');
  }
  const queryDomain = loadEnvFile().ICELIGHT_QUERY_DOMAIN;
  const queryUrl = queryDomain
    ? `https://${queryDomain}`
    : constructWorkerUrl(workerNames.queryApi, subdomain ?? undefined) || null;

  return {
    projectName,
    config,
    apiToken,
    accountId,
    streamId,
    sinkId,
    pipelineId,
    streamMismatch: boundStreamId && boundStreamId !== streamId ? boundStreamId : null,
    kvNamespaceId,
    ingestUrl,
    queryUrl,
  };
}

/**
 * Delete every drizzle-cube cache entry from the query API's KV namespace
 */
export async function purgeQueryCache(namespaceId: string): Promise<number> {
  const output = await runQuietAsync(
    `wrangler kv key list --namespace-id ${namespaceId} --prefix "${CACHE_KEY_PREFIX}" --remote`
  );
  if (!output) {
    throw new Error('Could not list KV keys');
  }
  const keys = (JSON.parse(output.slice(output.indexOf('['))) as Array<{ name: string }>).map(
    (key) => key.name
  );
  if (keys.length === 0) {
    return 0;
  }

  const dir = mkdtempSync(join(tmpdir(), 'icelight-reseed-'));
  try {
    const file = join(dir, 'keys.json');
    writeFileSync(file, JSON.stringify(keys));
    const result = await runCommandWithOutputAsync(
      `wrangler kv bulk delete "${file}" --namespace-id ${namespaceId} --remote --force`
    );
    if (!result.success) {
      throw formatCommandError('Deleting KV keys failed', result.output);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  return keys.length;
}

/**
 * Count rows in analytics.events via the Basin SQL REST API (null on error)
 */
async function countEvents(accountId: string, bucketName: string, apiToken: string): Promise<number | null> {
  try {
    const response = await fetch(
      `https://api.sql.cloudflarestorage.com/api/v1/accounts/${accountId}/basin-sql/query/${bucketName}`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warehouse: `${accountId}_${bucketName}`,
          query: `SELECT COUNT(*) AS c FROM ${NAMESPACE}.${TABLE}`,
        }),
      }
    );
    if (!response.ok) return null;
    const data = (await response.json()) as {
      success: boolean;
      result?: { rows?: Array<Record<string, unknown>> };
    };
    const value = data.result?.rows?.[0] ? Object.values(data.result.rows[0])[0] : null;
    return value === null || value === undefined ? null : Number(value);
  } catch {
    return null;
  }
}

/**
 * Wait until the seeded events have landed in the table (the sink rolls
 * files every 60s), so the cache purge afterwards isn't refilled with
 * partial results. Gives up after `timeoutMs`.
 */
export async function waitForEvents(
  plan: ReseedPlan,
  expected: number,
  report: (message: string) => void,
  timeoutMs = 6 * 60 * 1000
): Promise<number | null> {
  const deadline = Date.now() + timeoutMs;
  let count: number | null = null;
  report('Waiting for the first sink roll (about 60s)...');
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 20000));
    count = await countEvents(plan.accountId, plan.config.bucketName, plan.apiToken);
    report(
      count === null
        ? 'Table not readable yet...'
        : `${count.toLocaleString()} of ${expected.toLocaleString()} events landed`
    );
    if (count !== null && count >= expected) break;
  }
  return count;
}
