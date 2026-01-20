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
    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets/${bucketName}/objects${cursor ? `?cursor=${cursor}` : ''}`;

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

      const data = (await response.json()) as {
        success: boolean;
        result: { objects: Array<{ key: string }>; cursor?: string; truncated?: boolean };
      };

      if (!data.success || !data.result) {
        break;
      }

      for (const obj of data.result.objects || []) {
        objects.push(obj.key);
      }

      cursor = data.result.truncated ? data.result.cursor : undefined;
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

  let deletedCount = 0;
  let failedCount = 0;

  for (const key of objects) {
    const output = await runQuietAsync(`wrangler r2 object delete "${bucketName}/${key}"`);
    if (output !== null) {
      deletedCount++;
      if (onProgress && deletedCount % 10 === 0) {
        onProgress(deletedCount, objects.length);
      }
    } else {
      failedCount++;
    }
  }

  return {
    success: failedCount < objects.length / 2,
    deletedCount,
    failedCount,
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
