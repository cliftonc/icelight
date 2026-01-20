/**
 * Summary display functions for teardown
 */

import type { Config, DeletedResources, TeardownOptions } from '../core/index.js';
import {
  c,
  symbols,
  sectionBox,
  blank,
  log,
} from '../core/index.js';
import { getRelativePath } from './local-files.js';

/**
 * Display resources that will be deleted
 */
export function displayResourcesToDelete(
  _projectName: string,
  config: Config,
  workerNames: string[],
  containerNames: string[],
  localConfigPaths: string[],
  options: TeardownOptions
): void {
  log(sectionBox('Resources to be Deleted', 'warning'));
  blank();

  log(c.warning('  Cloudflare Resources:'));
  log(`    ${symbols.bullet} Workers:     ${workerNames.join(', ')}`);
  log(`    ${symbols.bullet} Containers:  ${containerNames.join(', ')}`);
  log(`    ${symbols.bullet} Pipeline:    ${config.pipelineName}`);
  log(`    ${symbols.bullet} Sink:        ${config.sinkName}`);
  log(`    ${symbols.bullet} Stream:      ${config.streamName}`);
  log(`    ${symbols.bullet} KV Cache:    ${config.kvCacheName}`);
  log(`    ${symbols.bullet} D1 Database: ${config.d1DatabaseName}`);

  if (!options.keepBucket) {
    log(`    ${symbols.bullet} Bucket:      ${config.bucketName} ${c.error('(and ALL data!)')}`);
  } else {
    log(`    ${symbols.bullet} Bucket:      ${c.success('(KEEPING - data preserved)')}`);
  }

  blank();
  log(c.warning('  Local Files:'));
  for (const configPath of localConfigPaths) {
    log(`    ${symbols.bullet} ${getRelativePath(configPath)}`);
  }

  blank();
  log(c.success('  Preserved:'));
  log(`    ${symbols.bullet} .env (contains project name and API token)`);
  blank();
}

/**
 * Display teardown summary
 */
export function displayTeardownSummary(
  deleted: DeletedResources,
  config: Config,
  options: TeardownOptions
): void {
  log(sectionBox('Teardown Complete!', 'success'));
  blank();

  log(c.info('  Summary:'));

  // Workers
  if (deleted.workers.length > 0) {
    log(`    ${symbols.success} Deleted ${deleted.workers.length} worker(s)`);
  } else {
    log(`    ${symbols.warning} No workers deleted`);
  }

  // Containers
  if (deleted.containers.length > 0) {
    log(`    ${symbols.success} Deleted ${deleted.containers.length} container(s)`);
  } else {
    log(`    ${symbols.warning} No containers deleted`);
  }

  // Pipeline resources
  if (deleted.pipeline) {
    log(`    ${symbols.success} Deleted pipeline`);
  }
  if (deleted.sink) {
    log(`    ${symbols.success} Deleted sink`);
  }
  if (deleted.stream) {
    log(`    ${symbols.success} Deleted stream`);
  }

  // KV
  if (deleted.kvCache) {
    log(`    ${symbols.success} Deleted KV namespace`);
  }
  if (deleted.kvCachePreview) {
    log(`    ${symbols.success} Deleted KV preview namespace`);
  }

  // D1
  if (deleted.d1Database) {
    log(`    ${symbols.success} Deleted D1 database`);
  }

  // Bucket
  if (!options.keepBucket) {
    if (deleted.bucket) {
      log(`    ${symbols.success} Emptied and deleted R2 bucket`);
    }
  } else {
    log(`    ${symbols.warning} R2 bucket "${config.bucketName}" was preserved`);
    log('      To delete it manually:');
    log(`        wrangler r2 bucket delete ${config.bucketName}`);
  }

  // Local configs
  if (deleted.localConfigs.length > 0) {
    log(`    ${symbols.success} Deleted ${deleted.localConfigs.length} local config file(s)`);
  }

  log(`    ${symbols.success} Preserved .env file`);

  blank();
  log(c.info('  To recreate the infrastructure, run:'));
  log('    pnpm launch');
  blank();
}

/**
 * Display auth failure message
 */
export function displayAuthFailure(): void {
  log(sectionBox('Authentication Required', 'error'));
  blank();
  log(c.error('  You are not logged in to Cloudflare.'));
  blank();
  log('  Please run the following command to authenticate:');
  log(`    ${c.info('wrangler login')}`);
  blank();
  log('  After logging in, run this script again.');
  blank();
}

/**
 * Display teardown failure message
 */
export function displayTeardownFailure(message: string): void {
  log(sectionBox('Teardown Failed', 'error'));
  blank();
  log(c.error(`  ${message}`));
  blank();
}
