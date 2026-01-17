#!/usr/bin/env tsx
/**
 * Teardown script for cdpflare infrastructure
 * Deletes Pipeline, Sink, Stream, and optionally R2 bucket
 *
 * Usage: pnpm teardown
 *
 * Options:
 * - --keep-bucket: Don't delete the R2 bucket (preserves data)
 * - --force: Skip confirmation prompt
 *
 * Environment variables (should match setup):
 * - BUCKET_NAME: R2 bucket name (default: cdpflare-data)
 * - PIPELINE_NAME: Pipeline name (default: cdpflare-events-pipeline)
 */

import { execSync } from 'child_process';
import * as readline from 'readline';

// Configuration with defaults
const config = {
  bucketName: process.env.BUCKET_NAME || 'cdpflare-data',
  pipelineName: process.env.PIPELINE_NAME || 'cdpflare-events-pipeline',
  streamName: process.env.STREAM_NAME || 'cdpflare-events-stream',
  sinkName: process.env.SINK_NAME || 'cdpflare-events-sink',
};

// Parse CLI args
const args = process.argv.slice(2);
const keepBucket = args.includes('--keep-bucket');
const force = args.includes('--force');

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

    // Check if it's a "not found" error (already deleted)
    if (stderr.includes('not found') || stderr.includes('does not exist')) {
      log(`  ⚠ Not found (skipping)`, 'yellow');
      return true;
    }

    log(`  ✗ Failed: ${stderr}`, 'red');
    return false;
  }
}

async function confirm(message: string): Promise<boolean> {
  if (force) return true;

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${colors.yellow}${message} (y/N): ${colors.reset}`, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

async function main() {
  log('\n╔════════════════════════════════════════════════════════════╗', 'red');
  log('║           cdpflare Infrastructure Teardown                  ║', 'red');
  log('╚════════════════════════════════════════════════════════════╝', 'red');

  log('\nThis will delete:', 'yellow');
  log(`  Pipeline: ${config.pipelineName}`);
  log(`  Sink:     ${config.sinkName}`);
  log(`  Stream:   ${config.streamName}`);
  if (!keepBucket) {
    log(`  Bucket:   ${config.bucketName} (and ALL data!)`, 'red');
  } else {
    log(`  Bucket:   ${config.bucketName} (KEEPING - data preserved)`, 'green');
  }

  const confirmed = await confirm('\nAre you sure you want to proceed?');
  if (!confirmed) {
    log('\nTeardown cancelled.', 'yellow');
    process.exit(0);
  }

  log('\nStarting teardown...', 'cyan');

  // Step 1: Delete pipeline
  run(
    `npx wrangler pipelines delete ${config.pipelineName} --force`,
    'Deleting Pipeline'
  );

  // Step 2: Delete sink
  run(
    `npx wrangler pipelines sink delete ${config.sinkName} --force`,
    'Deleting Sink'
  );

  // Step 3: Delete stream
  run(
    `npx wrangler pipelines stream delete ${config.streamName} --force`,
    'Deleting Stream'
  );

  // Step 4: Delete bucket (if not keeping)
  if (!keepBucket) {
    // First, empty the bucket
    run(
      `npx wrangler r2 object delete ${config.bucketName} --recursive`,
      'Emptying R2 bucket'
    );

    run(
      `npx wrangler r2 bucket delete ${config.bucketName}`,
      'Deleting R2 bucket'
    );
  }

  log('\n╔════════════════════════════════════════════════════════════╗', 'green');
  log('║           Teardown Complete!                                ║', 'green');
  log('╚════════════════════════════════════════════════════════════╝', 'green');

  if (keepBucket) {
    log(`\nNote: R2 bucket "${config.bucketName}" was preserved.`, 'yellow');
    log('To delete it manually:', 'yellow');
    log(`  npx wrangler r2 bucket delete ${config.bucketName}`);
  }
}

main().catch((error) => {
  log(`\nTeardown failed: ${error.message}`, 'red');
  process.exit(1);
});
