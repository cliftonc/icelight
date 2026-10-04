#!/usr/bin/env tsx
/**
 * icelight Demo Data Reseed
 *
 * Main entry point for the Ink-based reseed. Wipes analytics.events and sends
 * fresh demo events, without a full teardown/launch and without redeploying
 * workers.
 *
 * Usage: pnpm reseed [days]
 *
 * Options:
 * - --confirm: Skip confirmation prompt
 * - --reset-dashboard: Also reset the default dashboard
 * - --help: Show help message
 *
 * The stream is kept (its ID is bound in the ingest worker's
 * wrangler.local.jsonc). The pipeline and sink are deleted, the Basin Catalog
 * table is dropped and its files removed from R2, then the sink and pipeline
 * are recreated exactly as `pnpm launch` does and demo events are seeded.
 */

import React from 'react';
import { render } from 'ink';
import { ReseedApp } from './App.js';
import { NAMESPACE, TABLE, type ReseedOptions } from './steps.js';

/**
 * Parse CLI arguments
 */
function parseArgs(): ReseedOptions & { help: boolean } {
  const args = process.argv.slice(2);
  const positional = args.find((arg) => !arg.startsWith('-'));
  return {
    days: positional ? parseInt(positional, 10) : 30,
    // --yes kept as an alias for scripts written against the first version
    confirmed: args.includes('--confirm') || args.includes('--yes') || args.includes('-y'),
    resetDashboard: args.includes('--reset-dashboard'),
    help: args.includes('--help') || args.includes('-h'),
  };
}

/**
 * Display help message
 */
function displayHelp(): void {
  console.log(`
icelight Demo Data Reseed

Usage:
  pnpm reseed [days] [options]

Arguments:
  days                Days of demo history to generate (1-365, default 30)

Options:
  --confirm           Skip confirmation prompt
  --reset-dashboard   Also reset the default dashboard to the deployed config
  --help, -h          Show this help message

Description:
  Deletes all events in ${NAMESPACE}.${TABLE} and sends fresh demo events.
  Keeps the R2 bucket, Basin Catalog, stream, workers, KV and D1; recreates
  the sink and pipeline (Basin sinks can't write to an existing table).

Environment:
  INGEST_API_URL          Override the ingest URL (default: the ingest worker's workers.dev URL)
  ICELIGHT_INGEST_TOKEN   Ingest write key (default: from .env, written by pnpm launch)

Examples:
  pnpm reseed                              # 30 days, with confirmation
  pnpm reseed 60                           # 60 days
  pnpm reseed --confirm --reset-dashboard  # Unattended, also reset the dashboard
`);
}

// Main
const cliArgs = parseArgs();

if (cliArgs.help) {
  displayHelp();
  process.exit(0);
}

if (isNaN(cliArgs.days) || cliArgs.days < 1 || cliArgs.days > 365) {
  console.error('Days must be a number between 1 and 365');
  process.exit(1);
}

const options: ReseedOptions = {
  days: cliArgs.days,
  confirmed: cliArgs.confirmed,
  resetDashboard: cliArgs.resetDashboard,
};

// Render the Ink app
render(React.createElement(ReseedApp, { options }));
