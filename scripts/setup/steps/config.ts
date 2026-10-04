/**
 * Configuration gathering step
 */

import type { Config } from '../core/types.js';
import { loadEnvFile, saveToEnvFile } from '../core/env.js';
import { promptProjectName } from '../core/prompts.js';

/**
 * Default project name
 */
export const DEFAULT_PROJECT_NAME = 'icelight';

/**
 * Get the saved project name from .env or use default
 */
export function getSavedProjectName(): string {
  const savedEnv = loadEnvFile();
  return savedEnv.ICELIGHT_PROJECT_NAME || savedEnv.CDPFLARE_PROJECT_NAME || DEFAULT_PROJECT_NAME;
}

/**
 * Derive all resource names from a project name
 * Bucket uses hyphens (R2 requirement), pipeline resources use underscores (stream requirement)
 */
export function deriveConfig(projectName: string): Config {
  const underscoreName = projectName.replace(/-/g, '_');
  return {
    bucketName: `${projectName}-data`,
    streamName: `${underscoreName}_events_stream`,
    sinkName: `${underscoreName}_events_sink`,
    pipelineName: `${underscoreName}_events_pipeline`,
    kvCacheName: `${projectName}-query-cache`,
    d1DatabaseName: `${projectName}-dashboards`,
  };
}

/**
 * Prompt for and save project configuration
 */
export async function gatherConfig(): Promise<{ projectName: string; config: Config }> {
  const savedProjectName = getSavedProjectName();
  const projectName = await promptProjectName(savedProjectName);

  // Save project name for future runs if changed
  if (projectName !== savedProjectName) {
    saveToEnvFile('ICELIGHT_PROJECT_NAME', projectName);
  }

  const config = deriveConfig(projectName);
  return { projectName, config };
}

/**
 * Get worker names derived from project name
 */
export function getWorkerNames(projectName: string) {
  return {
    eventIngest: `${projectName}-event-ingest`,
    queryApi: `${projectName}-query-api`,
  };
}

/**
 * Get config display lines for showing to user
 */
export function getConfigDisplayLines(config: Config, projectName?: string): string[] {
  const lines = [
    `${config.bucketName.padEnd(30)} (R2 Bucket + Basin Catalog)`,
    `${config.streamName.padEnd(30)} (Basin Pipelines Stream)`,
    `${config.sinkName.padEnd(30)} (Basin Pipelines Sink)`,
    `${config.pipelineName.padEnd(30)} (Basin Pipeline)`,
    `${config.kvCacheName.padEnd(30)} (KV Namespace)`,
    `${config.d1DatabaseName.padEnd(30)} (D1 Database)`,
  ];

  if (projectName) {
    const workers = getWorkerNames(projectName);
    lines.push(
      `${workers.eventIngest.padEnd(30)} (Worker)`,
      `${workers.queryApi.padEnd(30)} (Worker)`,
    );
  }

  return lines;
}
