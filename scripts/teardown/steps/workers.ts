/**
 * Worker deletion operations
 */

import { runCommandWithOutputAsync } from '../core/index.js';

/**
 * Result of a deletion operation
 */
export interface DeletionResult {
  success: boolean;
  notFound: boolean;
  error?: string;
}

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
 * Delete a worker by name
 */
export async function deleteWorker(workerName: string): Promise<DeletionResult> {
  const result = await runCommandWithOutputAsync(
    `wrangler delete --name ${workerName} --force`
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
 * Delete multiple workers
 */
export async function deleteWorkers(
  workerNames: string[]
): Promise<Map<string, DeletionResult>> {
  const results = new Map<string, DeletionResult>();

  for (const name of workerNames) {
    const result = await deleteWorker(name);
    results.set(name, result);
  }

  return results;
}
