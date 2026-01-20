/**
 * Pipeline resource deletion operations
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
 * Delete a pipeline by ID
 */
export async function deletePipeline(pipelineId: string): Promise<DeletionResult> {
  const result = await runCommandWithOutputAsync(
    `wrangler pipelines delete ${pipelineId} --force`
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
 * Delete a sink by ID
 */
export async function deleteSink(sinkId: string): Promise<DeletionResult> {
  const result = await runCommandWithOutputAsync(
    `wrangler pipelines sinks delete ${sinkId} --force`
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
 * Delete a stream by ID
 */
export async function deleteStream(streamId: string): Promise<DeletionResult> {
  const result = await runCommandWithOutputAsync(
    `wrangler pipelines streams delete ${streamId} --force`
  );

  if (result.success) {
    return { success: true, notFound: false };
  }

  if (isNotFoundError(result.output)) {
    return { success: true, notFound: true };
  }

  return { success: false, notFound: false, error: result.output };
}
