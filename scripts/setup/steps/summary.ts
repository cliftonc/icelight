/**
 * Final summary display step
 */

import boxen from 'boxen';
import type { Config, ExistingResources, DeployedUrls } from '../core/types.js';
import { colors, c } from '../core/colors.js';
import { symbols } from '../core/ui.js';

/**
 * Generate resource summary section
 */
export function getResourceSummary(config: Config, resources: ExistingResources): string[] {
  const lines: string[] = [];

  lines.push(c.header('Resources'));
  lines.push('');

  // R2 Bucket
  lines.push(`  ${c.accent('R2 Bucket:')} ${config.bucketName}`);

  // Stream
  lines.push(`  ${c.accent('Stream:')} ${config.streamName}`);
  if (resources.stream.id) {
    lines.push(`    ID: ${c.value(resources.stream.id)}`);
    lines.push(`    HTTP: https://${resources.stream.id}.ingest.cloudflare.com`);
  }

  // Sink
  lines.push(`  ${c.accent('Sink:')} ${config.sinkName}`);
  if (resources.sink.id) {
    lines.push(`    ID: ${resources.sink.id}`);
  }
  lines.push(`    Path: ${config.bucketName}/events/`);

  // Pipeline
  lines.push(`  ${c.accent('Pipeline:')} ${config.pipelineName}`);
  if (resources.pipeline.id) {
    lines.push(`    ID: ${resources.pipeline.id}`);
  }
  lines.push(c.dim(`    SQL: INSERT INTO ${config.sinkName} SELECT * FROM ${config.streamName}`));

  return lines;
}

/**
 * Generate worker URLs section
 */
export function getWorkerUrlsSummary(deployedUrls: DeployedUrls): string[] {
  const lines: string[] = [];

  lines.push(c.header('Deployed Workers'));
  lines.push('');
  lines.push(`  ${symbols.success} Event Ingest: ${deployedUrls.ingest || c.warning('(not deployed)')}`);
  lines.push(`  ${symbols.success} DuckDB API:   ${deployedUrls.duckdb || c.warning('(not deployed)')}`);
  lines.push(`  ${symbols.success} Query API:    ${deployedUrls.query || c.warning('(not deployed)')}`);

  return lines;
}

/**
 * Generate test commands section
 */
export function getTestCommands(deployedUrls: DeployedUrls): string[] {
  const lines: string[] = [];

  if (deployedUrls.ingest) {
    lines.push(c.header('Test Event Ingestion'));
    lines.push('');
    lines.push(c.dim('  curl -X POST ' + deployedUrls.ingest + '/v1/track \\'));
    lines.push(c.dim('    -H "Content-Type: application/json" \\'));
    lines.push(c.dim('    -d \'{"userId":"test","event":"Test Event"}\''));
    lines.push('');
  }

  if (deployedUrls.duckdb) {
    lines.push(c.header('Query Data (via DuckDB)'));
    lines.push('');
    lines.push(c.dim('  curl -X POST ' + deployedUrls.duckdb + '/query \\'));
    lines.push(c.dim('    -H "Content-Type: application/json" \\'));
    lines.push(c.dim('    -d \'{"query": "SELECT * FROM r2_datalake.analytics.events LIMIT 5"}\''));
    lines.push('');
  }

  if (deployedUrls.query) {
    lines.push(c.header('Open Query UI'));
    lines.push('');
    lines.push(`  ${c.url(deployedUrls.query)}`);
    lines.push('');
  }

  return lines;
}

/**
 * Display full success summary
 */
export function displaySuccessSummary(
  config: Config,
  resources: ExistingResources,
  deployedUrls: DeployedUrls
): void {
  console.log();
  console.log(
    boxen(c.success('Setup Complete!'), {
      padding: { left: 2, right: 2, top: 0, bottom: 0 },
      borderColor: colors.success,
      borderStyle: 'double',
    })
  );
  console.log();

  // Resource summary
  const resourceLines = getResourceSummary(config, resources);
  for (const line of resourceLines) {
    console.log(line);
  }
  console.log();

  // Worker URLs
  const workerLines = getWorkerUrlsSummary(deployedUrls);
  for (const line of workerLines) {
    console.log(line);
  }
  console.log();

  // Test commands
  const testLines = getTestCommands(deployedUrls);
  for (const line of testLines) {
    console.log(line);
  }

  console.log(c.muted('  See README.md for full documentation.'));
  console.log();
}

/**
 * Display authentication failure message
 */
export function displayAuthFailure(): void {
  console.log();
  console.log(
    boxen(c.error('Authentication Required'), {
      padding: { left: 2, right: 2, top: 0, bottom: 0 },
      borderColor: colors.error,
      borderStyle: 'round',
    })
  );
  console.log();
  console.log('  Not logged in to Cloudflare');
  console.log();
  console.log('  Please run the following command to authenticate:');
  console.log(c.accent('    wrangler login'));
  console.log();
  console.log('  This will open a browser window to authorize wrangler.');
  console.log('  After logging in, run this setup script again.');
  console.log();
}

/**
 * Display setup failure message
 */
export function displaySetupFailure(message: string): void {
  console.log();
  console.log(
    boxen(c.error('Setup Failed'), {
      padding: { left: 2, right: 2, top: 0, bottom: 0 },
      borderColor: colors.error,
      borderStyle: 'round',
    })
  );
  console.log();
  console.log(`  ${c.error(message)}`);
  console.log();
}
