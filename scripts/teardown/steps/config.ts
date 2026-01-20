/**
 * Configuration loading for teardown
 */

import { join } from 'path';
import {
  loadEnvFile,
  deriveConfig,
  getWorkerNames,
  getWorkersPath,
} from '../core/index.js';
import type { Config, LocalConfigPaths } from '../core/index.js';

/**
 * Default project name
 */
export const DEFAULT_PROJECT_NAME = 'icelight';

/**
 * Get the saved project name from .env or use default
 */
export function getProjectName(): string {
  const savedEnv = loadEnvFile();
  return savedEnv.CDPFLARE_PROJECT_NAME || DEFAULT_PROJECT_NAME;
}

/**
 * Get the saved API token from .env
 */
export function getApiToken(): string {
  const savedEnv = loadEnvFile();
  return savedEnv.ICELIGHT_API_TOKEN || savedEnv.CDPFLARE_API_TOKEN || '';
}

/**
 * Get worker names derived from project name
 */
export function getWorkerNamesList(projectName: string): string[] {
  const names = getWorkerNames(projectName);
  return [names.eventIngest, names.duckdbApi, names.queryApi];
}

/**
 * Get container names derived from project name
 */
export function getContainerNamesList(projectName: string): string[] {
  return [`${projectName}-duckdb-api-duckdbcontainer`];
}

/**
 * Get local config file paths
 */
export function getLocalConfigPaths(): LocalConfigPaths {
  const workersPath = getWorkersPath();
  return {
    eventIngest: join(workersPath, 'event-ingest', 'wrangler.local.jsonc'),
    duckdbApi: join(workersPath, 'duckdb-api', 'wrangler.local.jsonc'),
    queryApi: join(workersPath, 'query-api', 'wrangler.local.jsonc'),
  };
}

/**
 * Get all local config paths as an array
 */
export function getLocalConfigPathsList(): string[] {
  const paths = getLocalConfigPaths();
  return [paths.eventIngest, paths.duckdbApi, paths.queryApi];
}

/**
 * Load teardown configuration from .env
 */
export function loadTeardownConfig(): {
  projectName: string;
  config: Config;
  apiToken: string;
} {
  const projectName = getProjectName();
  const config = deriveConfig(projectName);
  const apiToken = getApiToken();

  return { projectName, config, apiToken };
}
