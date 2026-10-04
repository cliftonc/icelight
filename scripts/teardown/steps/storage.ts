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
 * Delete a single object using the Cloudflare API
 */
async function deleteObject(
  bucketName: string,
  key: string,
  apiToken: string,
  accountId: string
): Promise<boolean> {
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets/${bucketName}/objects/${encodeURIComponent(key)}`;
  try {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${apiToken}` },
    });
    return response.ok || response.status === 404;
  } catch {
    return false;
  }
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
  onProgress?: EmptyBucketProgressCallback
): Promise<{ deleted: number; failed: number }> {
  const concurrency = 25;
  let deleted = 0;
  let failed = 0;
  let next = 0;

  const worker = async () => {
    while (next < keys.length) {
      const key = keys[next++];
      if (await deleteObject(bucketName, key, apiToken, accountId)) {
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
  onProgress?: EmptyBucketProgressCallback
): Promise<{ success: boolean; deletedCount: number; failedCount: number }> {
  const objects = await listBucketObjects(bucketName, apiToken, accountId);

  if (objects.length === 0) {
    return { success: true, deletedCount: 0, failedCount: 0 };
  }

  const { deleted, failed } = await deleteObjects(bucketName, objects, apiToken, accountId, onProgress);

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
export async function deleteBucket(bucketName: string): Promise<DeletionResult> {
  const result = await runCommandWithOutputAsync(
    `wrangler r2 bucket delete ${bucketName}`
  );

  if (result.success) {
    return { success: true, notFound: false };
  }

  if (isNotFoundError(result.output)) {
    return { success: true, notFound: true };
  }

  return { success: false, notFound: false, error: result.output };
}
