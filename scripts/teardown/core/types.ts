/**
 * Teardown-specific TypeScript interfaces
 */

import type { Config, AuthInfo } from '../../setup/core/types.js';

// Re-export setup types for convenience
export type { Config, AuthInfo };

/**
 * Resource IDs discovered from Cloudflare
 */
export interface ResourceIds {
  streamId: string | null;
  sinkId: string | null;
  pipelineId: string | null;
  containerIds: Map<string, string>;
  kvCacheId: string | null;
  kvCachePreviewId: string | null;
  d1DatabaseId: string | null;
  existingWorkers: Set<string>;
}

/**
 * CLI options for teardown
 */
export interface TeardownOptions {
  confirmed: boolean;
  keepBucket: boolean;
}

/**
 * Tracking of deleted resources
 */
export interface DeletedResources {
  workers: string[];
  containers: string[];
  pipeline: boolean;
  sink: boolean;
  stream: boolean;
  kvCache: boolean;
  kvCachePreview: boolean;
  d1Database: boolean;
  bucket: boolean;
  localConfigs: string[];
}

/**
 * Main context object passed through teardown tasks
 */
export interface TeardownContext {
  projectName: string;
  config: Config;
  authInfo: AuthInfo;
  apiToken: string;
  resourceIds: ResourceIds;
  options: TeardownOptions;
  deletedResources: DeletedResources;
}

/**
 * Worker names derived from project name
 */
export interface WorkerNames {
  eventIngest: string;
  duckdbApi: string;
  queryApi: string;
}

/**
 * Container names derived from project name
 */
export interface ContainerNames {
  duckdbContainer: string;
}

/**
 * Local config file paths
 */
export interface LocalConfigPaths {
  eventIngest: string;
  duckdbApi: string;
  queryApi: string;
}
