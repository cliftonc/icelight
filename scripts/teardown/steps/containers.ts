/**
 * Container deletion operations
 */

import { runCommandWithOutputAsync } from '../core/index.js';
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
 * Delete a container by ID
 */
export async function deleteContainer(containerId: string): Promise<DeletionResult> {
  const result = await runCommandWithOutputAsync(
    `wrangler containers delete ${containerId}`
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
 * Delete multiple containers by their name-to-ID mapping
 */
export async function deleteContainers(
  containerIds: Map<string, string>
): Promise<Map<string, DeletionResult>> {
  const results = new Map<string, DeletionResult>();

  for (const [name, id] of containerIds) {
    const result = await deleteContainer(id);
    results.set(name, result);
  }

  return results;
}
