/**
 * Shared TypeScript interfaces for the icelight setup system
 */

/**
 * Resource configuration derived from project name
 */
export interface Config {
  bucketName: string;
  streamName: string;
  sinkName: string;
  pipelineName: string;
  kvCacheName: string;
  d1DatabaseName: string;
}

/**
 * Authentication information from wrangler whoami
 */
export interface AuthInfo {
  authenticated: boolean;
  email?: string;
  accountId?: string;
  subdomain?: string;
}

/**
 * Status of existing Cloudflare resources
 */
export interface ExistingResources {
  bucket: boolean;
  catalogEnabled: boolean;
  stream: { exists: boolean; id: string | null };
  sink: { exists: boolean; id: string | null };
  pipeline: { exists: boolean; id: string | null };
  kvCache: { exists: boolean; id: string | null; previewId: string | null };
  d1Database: { exists: boolean; id: string | null };
}

/**
 * URLs of deployed workers
 */
export interface DeployedUrls {
  ingest?: string;
  duckdb?: string;
  query?: string;
}

/**
 * Status of worker secrets
 */
export interface SecretStatus {
  CF_ACCOUNT_ID: boolean;
  CF_API_TOKEN: boolean;
}

/**
 * Result of running a command
 */
export interface CommandResult {
  success: boolean;
  output: string;
}

/**
 * Worker deployment status
 */
export interface WorkerStatus {
  deployed: boolean;
  url: string | null;
}

/**
 * Main context object passed through setup steps
 */
export interface SetupContext {
  projectName: string;
  config: Config;
  authInfo: AuthInfo;
  apiToken: string;
  resources: ExistingResources;
  deployedUrls: DeployedUrls;
  warehouseName: string;
  catalogUri: string;
}

/**
 * Environment variables loaded from .env file
 */
export interface SavedEnv {
  CDPFLARE_PROJECT_NAME?: string;
  CDPFLARE_API_TOKEN?: string;
  [key: string]: string | undefined;
}

/**
 * Options for creating wrangler local config
 */
export interface LocalConfigOptions {
  kvCacheId?: string | null;
  kvCachePreviewId?: string | null;
  d1DatabaseId?: string | null;
  d1DatabaseName?: string | null;
}
