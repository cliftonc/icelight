/**
 * Resource status checking step
 */

import type { Config, ExistingResources } from '../core/types.js';
import { runQuietAsync } from '../core/wrangler.js';

/**
 * Check status of all existing Cloudflare resources (async for spinner animation)
 */
export async function checkExistingResources(config: Config): Promise<ExistingResources> {
  const resources: ExistingResources = {
    bucket: false,
    catalogEnabled: false,
    stream: { exists: false, id: null },
    sink: { exists: false, id: null },
    pipeline: { exists: false, id: null },
    kvCache: { exists: false, id: null, previewId: null },
    d1Database: { exists: false, id: null },
  };

  // Check R2 bucket
  const bucketsOutput = await runQuietAsync('wrangler r2 bucket list');
  if (bucketsOutput && bucketsOutput.includes(config.bucketName)) {
    resources.bucket = true;

    // Check if catalog is enabled
    const catalogOutput = await runQuietAsync(`wrangler r2 bucket catalog get ${config.bucketName}`);
    if (catalogOutput && (catalogOutput.includes('active') || catalogOutput.includes('enabled'))) {
      resources.catalogEnabled = true;
    }
  }

  // Check streams
  const streamsOutput = await runQuietAsync('wrangler pipelines streams list');
  if (streamsOutput) {
    const lines = streamsOutput.split('\n');
    for (const line of lines) {
      if (line.includes(config.streamName)) {
        resources.stream.exists = true;
        const idMatch = line.match(/([a-f0-9]{32})/i);
        if (idMatch) {
          resources.stream.id = idMatch[1];
        }
        break;
      }
    }
  }

  // Check sinks
  const sinksOutput = await runQuietAsync('wrangler pipelines sinks list');
  if (sinksOutput) {
    const lines = sinksOutput.split('\n');
    for (const line of lines) {
      if (line.includes(config.sinkName)) {
        resources.sink.exists = true;
        const idMatch = line.match(/([a-f0-9]{32})/i);
        if (idMatch) {
          resources.sink.id = idMatch[1];
        }
        break;
      }
    }
  }

  // Check pipelines
  const pipelinesOutput = await runQuietAsync('wrangler pipelines list');
  if (pipelinesOutput) {
    const lines = pipelinesOutput.split('\n');
    for (const line of lines) {
      if (line.includes(config.pipelineName)) {
        resources.pipeline.exists = true;
        const idMatch = line.match(/([a-f0-9]{32})/i);
        if (idMatch) {
          resources.pipeline.id = idMatch[1];
        }
        break;
      }
    }
  }

  // Check KV namespaces (output is JSON array)
  const kvOutput = await runQuietAsync('wrangler kv namespace list');
  if (kvOutput) {
    try {
      const namespaces = JSON.parse(kvOutput) as Array<{ id: string; title: string }>;
      for (const ns of namespaces) {
        if (ns.title === config.kvCacheName) {
          resources.kvCache.exists = true;
          resources.kvCache.id = ns.id;
        } else if (ns.title === `${config.kvCacheName}_preview`) {
          resources.kvCache.previewId = ns.id;
        }
      }
    } catch {
      // Fallback to line-based parsing if JSON fails
      const lines = kvOutput.split('\n');
      for (const line of lines) {
        if (line.includes(config.kvCacheName)) {
          const isPreview = line.toLowerCase().includes('preview');
          const idMatch = line.match(/([a-f0-9]{32})/i);
          if (idMatch) {
            if (isPreview) {
              resources.kvCache.previewId = idMatch[1];
            } else {
              resources.kvCache.exists = true;
              resources.kvCache.id = idMatch[1];
            }
          }
        }
      }
    }
  }

  // Check D1 databases
  const d1Output = await runQuietAsync('wrangler d1 list');
  if (d1Output) {
    const lines = d1Output.split('\n');
    for (const line of lines) {
      if (line.includes(config.d1DatabaseName)) {
        resources.d1Database.exists = true;
        // D1 database IDs are UUIDs
        const idMatch = line.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
        if (idMatch) {
          resources.d1Database.id = idMatch[1];
        }
        break;
      }
    }
  }

  return resources;
}

/**
 * Determine what resources need to be created
 */
export function getResourcesNeeded(resources: ExistingResources): {
  needsBucket: boolean;
  needsCatalog: boolean;
  needsStream: boolean;
  needsSink: boolean;
  needsPipeline: boolean;
  needsKvCache: boolean;
  needsKvCachePreview: boolean;
  needsD1Database: boolean;
  allExist: boolean;
} {
  const needsBucket = !resources.bucket;
  const needsCatalog = !resources.catalogEnabled;
  const needsStream = !resources.stream.exists;
  const needsSink = !resources.sink.exists;
  const needsPipeline = !resources.pipeline.exists;
  const needsKvCache = !resources.kvCache.exists;
  const needsKvCachePreview = !resources.kvCache.previewId;
  const needsD1Database = !resources.d1Database.exists;

  const allExist =
    !needsBucket &&
    !needsCatalog &&
    !needsStream &&
    !needsSink &&
    !needsPipeline &&
    !needsKvCache &&
    !needsKvCachePreview &&
    !needsD1Database;

  return {
    needsBucket,
    needsCatalog,
    needsStream,
    needsSink,
    needsPipeline,
    needsKvCache,
    needsKvCachePreview,
    needsD1Database,
    allExist,
  };
}

/**
 * Get catalog info (warehouse name and URI) for a bucket (async for spinner animation)
 */
export async function getCatalogInfo(bucketName: string): Promise<{ warehouseName: string; catalogUri: string } | null> {
  const catalogOutput = await runQuietAsync(`wrangler r2 bucket catalog get ${bucketName}`);
  if (!catalogOutput) {
    return null;
  }

  let warehouseName = '';
  let catalogUri = '';

  // Extract catalog URI
  const uriMatch = catalogOutput.match(/Catalog URI:\s+(https:\/\/[^\s]+)/);
  if (uriMatch) {
    catalogUri = uriMatch[1];
  }

  // Extract warehouse name
  const warehouseMatch = catalogOutput.match(/Warehouse:\s+(\S+)/);
  if (warehouseMatch) {
    warehouseName = warehouseMatch[1];
  }

  if (!warehouseName && !catalogUri) {
    return null;
  }

  return { warehouseName, catalogUri };
}
