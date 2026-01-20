/**
 * Infrastructure creation helpers
 */

import type { Config, ExistingResources, CommandResult } from '../core/types.js';
import { runCommandAsync, runCommandWithOutputAsync, getSchemaPath } from '../core/wrangler.js';

/**
 * Create R2 bucket (async for spinner animation)
 */
export async function createBucket(bucketName: string): Promise<boolean> {
  return runCommandAsync(`wrangler r2 bucket create ${bucketName}`);
}

/**
 * Enable Data Catalog for bucket (async for spinner animation)
 */
export async function enableCatalog(bucketName: string): Promise<boolean> {
  return runCommandAsync(`wrangler r2 bucket catalog enable ${bucketName}`);
}

/**
 * Create stream with schema (async for spinner animation)
 */
export async function createStream(streamName: string): Promise<boolean> {
  const schemaPath = getSchemaPath();
  const cmd = `wrangler pipelines streams create ${streamName} ` +
    `--schema-file "${schemaPath}" ` +
    `--http-enabled true ` +
    `--http-auth false`;
  return runCommandAsync(cmd);
}

/**
 * Create sink for R2 Data Catalog (async for spinner animation)
 */
export async function createSink(sinkName: string, bucketName: string, apiToken: string): Promise<boolean> {
  const cmd = `wrangler pipelines sinks create ${sinkName} ` +
    `--type r2-data-catalog ` +
    `--bucket ${bucketName} ` +
    `--namespace analytics ` +
    `--table events ` +
    `--roll-interval 60 ` +
    `--catalog-token "${apiToken}"`;
  return runCommandAsync(cmd);
}

/**
 * Create pipeline connecting stream to sink (async for spinner animation)
 */
export async function createPipeline(pipelineName: string, sinkName: string, streamName: string): Promise<boolean> {
  const cmd = `wrangler pipelines create ${pipelineName} ` +
    `--sql "INSERT INTO ${sinkName} SELECT * FROM ${streamName}"`;
  return runCommandAsync(cmd);
}

/**
 * Create KV namespace (async for spinner animation)
 */
export async function createKvNamespace(kvCacheName: string): Promise<CommandResult & { id?: string }> {
  const result = await runCommandWithOutputAsync(`wrangler kv namespace create "${kvCacheName}"`);
  if (result.success) {
    const idMatch = result.output.match(/id\s*=\s*"([a-f0-9]{32})"/i);
    return { ...result, id: idMatch?.[1] };
  }
  return result;
}

/**
 * Create KV preview namespace (async for spinner animation)
 */
export async function createKvPreviewNamespace(kvCacheName: string): Promise<CommandResult & { id?: string }> {
  const result = await runCommandWithOutputAsync(`wrangler kv namespace create "${kvCacheName}" --preview`);
  if (result.success) {
    const idMatch = result.output.match(/id\s*=\s*"([a-f0-9]{32})"/i);
    return { ...result, id: idMatch?.[1] };
  }
  return result;
}

/**
 * Create D1 database (async for spinner animation)
 */
export async function createD1Database(databaseName: string): Promise<CommandResult & { id?: string }> {
  const result = await runCommandWithOutputAsync(`wrangler d1 create "${databaseName}"`);
  if (result.success) {
    const idMatch = result.output.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
    return { ...result, id: idMatch?.[1] };
  }
  return result;
}

/**
 * Run D1 migration (async for spinner animation)
 */
export async function runD1Migration(databaseName: string, migrationPath: string): Promise<boolean> {
  return runCommandAsync(`wrangler d1 execute "${databaseName}" --file="${migrationPath}" --remote`);
}

/**
 * Create all infrastructure resources that are needed
 */
export async function createInfrastructure(
  config: Config,
  resources: ExistingResources,
  apiToken: string,
  onProgress?: (step: string, success: boolean) => void
): Promise<ExistingResources> {
  const updated = { ...resources };
  const report = (step: string, success: boolean) => {
    if (onProgress) onProgress(step, success);
  };

  // Create bucket if needed
  if (!resources.bucket) {
    const success = await createBucket(config.bucketName);
    report('bucket', success);
    if (success) updated.bucket = true;
    else return updated;
  }

  // Enable catalog if needed
  if (!resources.catalogEnabled) {
    const success = await enableCatalog(config.bucketName);
    report('catalog', success);
    if (success) updated.catalogEnabled = true;
    else return updated;
  }

  // Create stream if needed
  if (!resources.stream.exists) {
    const success = await createStream(config.streamName);
    report('stream', success);
    if (success) updated.stream.exists = true;
    else return updated;
  }

  // Create sink if needed
  if (!resources.sink.exists) {
    const success = await createSink(config.sinkName, config.bucketName, apiToken);
    report('sink', success);
    if (success) updated.sink.exists = true;
    else return updated;
  }

  // Create pipeline if needed
  if (!resources.pipeline.exists) {
    const success = await createPipeline(config.pipelineName, config.sinkName, config.streamName);
    report('pipeline', success);
    if (success) updated.pipeline.exists = true;
    else return updated;
  }

  // Create KV namespace if needed
  if (!resources.kvCache.exists) {
    const result = await createKvNamespace(config.kvCacheName);
    report('kvCache', result.success);
    if (result.success && result.id) {
      updated.kvCache.exists = true;
      updated.kvCache.id = result.id;
    }
  }

  // Create KV preview namespace if needed
  if (!resources.kvCache.previewId) {
    const result = await createKvPreviewNamespace(config.kvCacheName);
    report('kvCachePreview', result.success);
    if (result.success && result.id) {
      updated.kvCache.previewId = result.id;
    }
  }

  // Create D1 database if needed
  if (!resources.d1Database.exists) {
    const result = await createD1Database(config.d1DatabaseName);
    report('d1Database', result.success);
    if (result.success && result.id) {
      updated.d1Database.exists = true;
      updated.d1Database.id = result.id;
    }
  }

  return updated;
}
