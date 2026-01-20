#!/usr/bin/env tsx
/**
 * icelight Infrastructure Teardown
 *
 * Main entry point for the Ink-based teardown system.
 *
 * Usage: pnpm teardown
 *
 * Options:
 * - --confirm: Skip confirmation prompt
 * - --keep-bucket: Don't delete the R2 bucket (preserves data)
 * - --help: Show help message
 */

import React from 'react';
import { render } from 'ink';
import { TeardownApp } from './App.js';
import type { TeardownOptions } from './core/types.js';

/**
 * Parse CLI arguments
 */
function parseArgs(): TeardownOptions & { help: boolean } {
  const args = process.argv.slice(2);
  return {
    confirmed: args.includes('--confirm'),
    keepBucket: args.includes('--keep-bucket'),
    help: args.includes('--help') || args.includes('-h'),
  };
}

/**
 * Display help message
 */
function displayHelp(): void {
  console.log(`
icelight Infrastructure Teardown

Usage:
  pnpm teardown [options]

Options:
  --confirm       Skip confirmation prompt
  --keep-bucket   Don't delete the R2 bucket (preserves data)
  --help, -h      Show this help message

Description:
  Deletes all Cloudflare resources created by 'pnpm launch'.
  Reads PROJECT_NAME from .env file to determine resource names.

Warning:
  This operation is destructive and cannot be undone.
  Use --keep-bucket to preserve your R2 data.

Examples:
  pnpm teardown                    # Interactive mode with confirmation
  pnpm teardown --confirm          # Skip confirmation prompt
  pnpm teardown --keep-bucket      # Keep R2 bucket and data
  pnpm teardown --confirm --keep-bucket  # Both options
`);
}

// Main
const cliArgs = parseArgs();

if (cliArgs.help) {
  displayHelp();
  process.exit(0);
}

const options: TeardownOptions = {
  confirmed: cliArgs.confirmed,
  keepBucket: cliArgs.keepBucket,
};

// Render the Ink app
render(React.createElement(TeardownApp, { cliOptions: options }));
