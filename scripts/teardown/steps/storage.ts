/**
 * Storage resource deletion operations (KV, D1, R2)
 */

import { runCommandWithOutputAsync, runQuietAsync } from '../core/index.js';
import type { DeletionResult } from './workers.js';

/**
 * Check if an error indicates "not found" (already deleted)
 */
function isNotFoundError(output: string): boolean {
  const lowerOutput = output.toLowerCase();
  return (
    lowerOutput.includes('not found') ||
    lowerOutput.includes('does not exist') ||
    lowerOutput.includes('could not be found')
  );
}

/**
 * Delete a KV namespace by ID
 */
export async function deleteKvNamespace(namespaceId: string): Promise<DeletionResult> {
  const result = await runCommandWithOutputAsync(
    `wrangler kv namespace delete --namespace-id ${namespaceId}`
  );

  if (result.success) {
    return { success: true, notFound: false };
  }

  if (isNotFoundError(result.output)) {
    return { success: true, notFound: true };
  }

  return { success: false, notFound: false, error: result.output };
}

/**
 * Delete a D1 database by name
 */
export async function deleteD1Database(databaseName: string): Promise<DeletionResult> {
  const result = await runCommandWithOutputAsync(
    `wrangler d1 delete ${databaseName} --skip-confirmation`
  );

  if (result.success) {
    return { success: true, notFound: false };
  }

  if (isNotFoundError(result.output)) {
    return { success: true, notFound: true };
  }

  return { success: false, notFound: false, error: result.output };
}

/**
 * List all objects in an R2 bucket using Cloudflare API
 */
export async function listBucketObjects(
  bucketName: string,
  apiToken: string,
  accountId: string
): Promise<string[]> {
  const objects: string[] = [];
  let cursor: string | undefined;

  do {
    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets/${bucketName}/objects?per_page=1000${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;

    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        break;
      }

      // The API returns `result` as an array of objects with paging in
      // `result_info`; older responses nested them as `result.objects`
      type R2Object = { key: string };
      const data = (await response.json()) as {
        success: boolean;
        result: R2Object[] | { objects?: R2Object[]; cursor?: string; truncated?: boolean };
        result_info?: { cursor?: string; is_truncated?: boolean };
      };

      if (!data.success || !data.result) {
        break;
      }

      const page = Array.isArray(data.result) ? data.result : data.result.objects ?? [];
      for (const obj of page) {
        objects.push(obj.key);
      }

      if (Array.isArray(data.result)) {
        cursor = data.result_info?.is_truncated ? data.result_info.cursor : undefined;
      } else {
        cursor = data.result.truncated ? data.result.cursor : undefined;
      }
    } catch {
      break;
    }
  } while (cursor);

  return objects;
}

/**
 * Progress callback for bucket emptying
 */
export type EmptyBucketProgressCallback = (deleted: number, total: number) => void;

/**
 * Status callback for long waits (e.g. API rate limiting)
 */
export type StatusCallback = (message: string) => void;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Delete a single object using the Cloudflare API.
 *
 * The API allows 1,200 requests per 5 minutes; when rate limited, wait for
 * the Retry-After period and try again.
 */
async function deleteObject(
  bucketName: string,
  key: string,
  apiToken: string,
  accountId: string,
  onStatus?: StatusCallback
): Promise<boolean> {
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets/${bucketName}/objects/${encodeURIComponent(key)}`;
  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${apiToken}` },
      });
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('retry-after') ?? '60', 10);
        const seconds = Number.isFinite(retryAfter) ? retryAfter : 60;
        onStatus?.(`Cloudflare API rate limit reached, waiting ${seconds}s before continuing...`);
        await sleep(seconds * 1000);
        continue;
      }
      return response.ok || response.status === 404;
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Delete objects using the Cloudflare API.
 *
 * The REST API has no bulk delete, so objects are deleted individually
 * with a bounded number of requests in flight.
 */
async function deleteObjects(
  bucketName: string,
  keys: string[],
  apiToken: string,
  accountId: string,
  onProgress?: EmptyBucketProgressCallback,
  onStatus?: StatusCallback
): Promise<{ deleted: number; failed: number }> {
  const concurrency = 10;
  let deleted = 0;
  let failed = 0;
  let next = 0;

  const worker = async () => {
    while (next < keys.length) {
      const key = keys[next++];
      if (await deleteObject(bucketName, key, apiToken, accountId, onStatus)) {
        deleted++;
      } else {
        failed++;
      }
      onProgress?.(deleted, keys.length);
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, keys.length) }, worker));
  return { deleted, failed };
}

/**
 * Empty an R2 bucket by deleting all objects
 */
export async function emptyBucket(
  bucketName: string,
  apiToken: string,
  accountId: string,
  onProgress?: EmptyBucketProgressCallback,
  onStatus?: StatusCallback
): Promise<{ success: boolean; deletedCount: number; failedCount: number }> {
  const objects = await listBucketObjects(bucketName, apiToken, accountId);

  if (objects.length === 0) {
    return { success: true, deletedCount: 0, failedCount: 0 };
  }

  const { deleted, failed } = await deleteObjects(bucketName, objects, apiToken, accountId, onProgress, onStatus);

  // Some deletes failed - retry what's left via wrangler
  if (failed > 0) {
    const remaining = await listBucketObjects(bucketName, apiToken, accountId);
    if (remaining.length > 0) {
      // Try individual deletion for remaining objects
      for (const key of remaining) {
        await runQuietAsync(`wrangler r2 object delete "${bucketName}/${key}" --remote`);
      }
    }
  }

  return {
    success: failed < objects.length / 2,
    deletedCount: deleted,
    failedCount: failed,
  };
}

/**
 * Delete an R2 bucket
 */
export async function deleteBucket(bucketName: string, onStatus?: StatusCallback): Promise<DeletionResult> {
  let result = await runCommandWithOutputAsync(
    `wrangler r2 bucket delete ${bucketName}`
  );

  // Emptying a large bucket can use up the API rate limit (code 971); wait it out
  for (let attempt = 0; attempt < 5 && !result.success && result.output.includes('971'); attempt++) {
    onStatus?.('Cloudflare API rate limit reached, waiting 65s before retrying bucket delete...');
    await sleep(65000);
    result = await runCommandWithOutputAsync(`wrangler r2 bucket delete ${bucketName}`);
  }

  if (result.success) {
    return { success: true, notFound: false };
  }

  if (isNotFoundError(result.output)) {
    return { success: true, notFound: true };
  }

  return { success: false, notFound: false, error: result.output };
}
