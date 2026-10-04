#!/usr/bin/env tsx
/**
 * Generate historical analytics events and send them to the ingest API
 *
 * Usage:
 *   pnpm generate-events              # Generate 30 days of data, batch size 100
 *   pnpm generate-events 90           # Generate 90 days of data
 *   pnpm generate-events 30 1000      # Generate 30 days with batch size 1000
 *
 * Environment variables:
 *   INGEST_API_URL - URL to the ingest API (default: http://localhost:8787)
 */

import { seedEvents } from './shared/seed-events.js';

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const days = args[0] ? parseInt(args[0], 10) : 30;
  const batchSize = args[1] ? parseInt(args[1], 10) : 100;

  if (isNaN(days) || days < 1 || days > 365) {
    log('Error: Days must be a number between 1 and 365', 'red');
    process.exit(1);
  }

  if (isNaN(batchSize) || batchSize < 1 || batchSize > 10000) {
    log('Error: Batch size must be a number between 1 and 10000', 'red');
    process.exit(1);
  }

  const ingestApiUrl = process.env.INGEST_API_URL || 'http://localhost:8787';

  log(`\n${'='.repeat(60)}`, 'cyan');
  log('  Event Generator - Historical Data', 'bold');
  log('='.repeat(60), 'cyan');
  log(`\nGenerating ${days} days of historical events...`, 'yellow');
  log(`Target ingest API: ${ingestApiUrl}`, 'dim');
  log(`Batch size: ${batchSize}\n`, 'dim');

  const result = await seedEvents({
    ingestApiUrl,
    days,
    batchSize,
    onProgress: ({ batch, totalBatches, sent, error }) => {
      const progress = `[${batch}/${totalBatches}]`;
      if (error) {
        log(`${progress} Failed: ${error}`, 'red');
      } else if (batch % 10 === 0 || batch === totalBatches) {
        // Show progress every 10 batches or on last batch
        log(`${progress} Sent ${sent.toLocaleString()} events...`, 'dim');
      }
    },
  });

  log(`\nGenerated ${result.total.toLocaleString()} events`, 'green');
  log(`  Users: ${result.userCount}`, 'dim');
  log(`  Sessions: ${result.sessionCount}`, 'dim');
  log(`  Event breakdown:`, 'dim');
  for (const [type, count] of Object.entries(result.eventCounts)) {
    log(`    ${type}: ${count}`, 'dim');
  }

  const totalTime = (result.durationMs / 1000).toFixed(2);

  log(`\n${'='.repeat(60)}`, 'cyan');
  if (result.errors === 0) {
    log(`  Successfully sent ${result.sent.toLocaleString()} events in ${totalTime}s`, 'green');
  } else {
    log(`  Sent ${result.sent.toLocaleString()} events with ${result.errors} batch errors in ${totalTime}s`, 'yellow');
  }
  log('='.repeat(60), 'cyan');
  log('Events appear in Basin SQL after the next sink roll (about 1-2 minutes).', 'dim');
}

main().catch(error => {
  log(`\nFatal error: ${error instanceof Error ? error.message : String(error)}`, 'red');
  process.exit(1);
});
