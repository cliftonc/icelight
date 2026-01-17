#!/usr/bin/env tsx
/**
 * Setup script for cdpflare infrastructure
 * Creates R2 bucket, Data Catalog, Stream, Sink, and Pipeline
 *
 * Usage: pnpm setup
 *
 * Environment variables (optional, defaults provided):
 * - BUCKET_NAME: R2 bucket name (default: cdpflare-data)
 * - PIPELINE_NAME: Pipeline name (default: cdpflare-events-pipeline)
 * - NAMESPACE: Iceberg namespace (default: analytics)
 * - TABLE_NAME: Iceberg table name (default: events)
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Configuration with defaults
const config = {
  bucketName: process.env.BUCKET_NAME || 'cdpflare-data',
  pipelineName: process.env.PIPELINE_NAME || 'cdpflare-events-pipeline',
  streamName: process.env.STREAM_NAME || 'cdpflare-events-stream',
  sinkName: process.env.SINK_NAME || 'cdpflare-events-sink',
  namespace: process.env.NAMESPACE || 'analytics',
  tableName: process.env.TABLE_NAME || 'events',
  compression: process.env.COMPRESSION || 'zstd',
  rollInterval: process.env.ROLL_INTERVAL || '60',
};

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function run(command: string, description: string): boolean {
  log(`\n> ${description}`, 'cyan');
  log(`  $ ${command}`, 'yellow');

  try {
    const output = execSync(command, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    if (output.trim()) {
      console.log(output);
    }
    log(`  ✓ Success`, 'green');
    return true;
  } catch (error) {
    const err = error as { stderr?: string; message?: string };
    const stderr = err.stderr || err.message || 'Unknown error';

    // Check if it's a "already exists" error (not a real failure)
    if (stderr.includes('already exists')) {
      log(`  ⚠ Already exists (skipping)`, 'yellow');
      return true;
    }

    log(`  ✗ Failed: ${stderr}`, 'red');
    return false;
  }
}

function getSchemaPath(): string {
  const schemaPath = join(__dirname, '..', 'templates', 'schema.events.json');
  if (!existsSync(schemaPath)) {
    throw new Error(`Schema file not found: ${schemaPath}`);
  }
  return schemaPath;
}

async function main() {
  log('\n╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║           cdpflare Infrastructure Setup                     ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');

  log('\nConfiguration:', 'cyan');
  log(`  Bucket:    ${config.bucketName}`);
  log(`  Pipeline:  ${config.pipelineName}`);
  log(`  Stream:    ${config.streamName}`);
  log(`  Sink:      ${config.sinkName}`);
  log(`  Namespace: ${config.namespace}`);
  log(`  Table:     ${config.tableName}`);

  const schemaPath = getSchemaPath();
  log(`  Schema:    ${schemaPath}`);

  // Step 1: Create R2 bucket
  const step1 = run(
    `npx wrangler r2 bucket create ${config.bucketName}`,
    'Creating R2 bucket'
  );

  if (!step1) {
    log('\nFailed to create R2 bucket. Aborting.', 'red');
    process.exit(1);
  }

  // Step 2: Enable Data Catalog on bucket
  const step2 = run(
    `npx wrangler r2 bucket catalog enable ${config.bucketName}`,
    'Enabling Data Catalog on bucket'
  );

  if (!step2) {
    log('\nFailed to enable Data Catalog. Aborting.', 'red');
    process.exit(1);
  }

  // Step 3: Create stream with schema
  const step3 = run(
    `npx wrangler pipelines stream create ${config.streamName} --schema-file ${schemaPath}`,
    'Creating Pipeline stream with schema'
  );

  if (!step3) {
    log('\nFailed to create stream. Aborting.', 'red');
    process.exit(1);
  }

  // Step 4: Create sink to R2 Data Catalog
  const step4 = run(
    `npx wrangler pipelines sink create ${config.sinkName} ` +
    `--type r2-data-catalog ` +
    `--bucket ${config.bucketName} ` +
    `--namespace ${config.namespace} ` +
    `--table ${config.tableName} ` +
    `--compression ${config.compression} ` +
    `--roll-interval ${config.rollInterval}`,
    'Creating Pipeline sink to R2 Data Catalog'
  );

  if (!step4) {
    log('\nFailed to create sink. Aborting.', 'red');
    process.exit(1);
  }

  // Step 5: Create pipeline connecting stream to sink
  const step5 = run(
    `npx wrangler pipelines create ${config.pipelineName} ` +
    `--r2 ${config.bucketName}`,
    'Creating Pipeline'
  );

  if (!step5) {
    log('\nFailed to create pipeline. Aborting.', 'red');
    process.exit(1);
  }

  log('\n╔════════════════════════════════════════════════════════════╗', 'green');
  log('║           Setup Complete!                                   ║', 'green');
  log('╚════════════════════════════════════════════════════════════╝', 'green');

  log('\nNext steps:', 'cyan');
  log('1. Update workers/event-ingest/wrangler.jsonc to uncomment pipeline binding');
  log('2. Deploy the ingest worker: pnpm deploy:ingest');
  log('3. Configure query worker secrets and deploy: pnpm deploy:query');
  log('\nSee README.md for full setup instructions.');
}

main().catch((error) => {
  log(`\nSetup failed: ${error.message}`, 'red');
  process.exit(1);
});
