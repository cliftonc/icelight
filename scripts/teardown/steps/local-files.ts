/**
 * Local config file deletion operations
 */

import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { getWorkersPath } from '../core/index.js';

/**
 * Result of deleting a local file
 */
export interface LocalFileDeletionResult {
  deleted: boolean;
  notFound: boolean;
  error?: string;
}

/**
 * Get root directory path (project root)
 */
export function getRootPath(): string {
  const workersPath = getWorkersPath();
  return join(workersPath, '..');
}

/**
 * Get relative path from root for display
 */
export function getRelativePath(absolutePath: string): string {
  const rootPath = getRootPath();
  if (absolutePath.startsWith(rootPath)) {
    return absolutePath.slice(rootPath.length + 1);
  }
  return absolutePath;
}

/**
 * Delete a local config file
 */
export function deleteLocalConfig(configPath: string): LocalFileDeletionResult {
  if (!existsSync(configPath)) {
    return { deleted: false, notFound: true };
  }

  try {
    unlinkSync(configPath);
    return { deleted: true, notFound: false };
  } catch (error) {
    return {
      deleted: false,
      notFound: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Delete multiple local config files
 */
export function deleteLocalConfigs(
  configPaths: string[]
): Map<string, LocalFileDeletionResult> {
  const results = new Map<string, LocalFileDeletionResult>();

  for (const path of configPaths) {
    const result = deleteLocalConfig(path);
    results.set(path, result);
  }

  return results;
}

/**
 * Check which local config files exist
 */
export function checkLocalConfigsExist(configPaths: string[]): Map<string, boolean> {
  const results = new Map<string, boolean>();

  for (const path of configPaths) {
    results.set(path, existsSync(path));
  }

  return results;
}
