/**
 * API token collection step
 */

import { loadEnvFile, saveToEnvFile } from '../core/env.js';
import { promptApiToken } from '../core/prompts.js';

/**
 * Get saved API token from .env file
 */
export function getSavedApiToken(): string {
  const savedEnv = loadEnvFile();
  return savedEnv.ICELIGHT_API_TOKEN || savedEnv.CDPFLARE_API_TOKEN || '';
}

/**
 * Collect API token - use saved or prompt for new one
 */
export async function collectApiToken(forcePrompt = false): Promise<string> {
  const savedToken = getSavedApiToken();

  if (savedToken && !forcePrompt) {
    return savedToken;
  }

  const token = await promptApiToken();
  if (token) {
    saveToEnvFile('ICELIGHT_API_TOKEN', token);
  }
  return token;
}

/**
 * Check if we have an API token available
 */
export function hasApiToken(): boolean {
  return !!getSavedApiToken();
}

/**
 * Get API token requirements info
 */
export function getTokenRequirements(): string[] {
  return [
    'icelight needs a Cloudflare API token (saved to .env as ICELIGHT_API_TOKEN).',
    '',
    'Create it at https://dash.cloudflare.com/profile/api-tokens:',
    '  1. Create Token → Create Custom Token',
    '  2. Add these Account permissions:',
    '       Basin Catalog   → Edit   (pipeline sink writes the Iceberg table)',
    '       Basin SQL       → Read   (query API runs SQL and dashboards)',
    '       Workers R2 Storage → Edit (read data files; teardown empties the bucket)',
    '       Workers Scripts → Read   (look up your workers.dev subdomain)',
    '  3. Account Resources → Include → your account',
    '  4. Continue to summary → Create Token, then copy the token value',
    '',
    'Older dashboards label Basin Catalog / Basin SQL as',
    '"Workers R2 Data Catalog" / "Workers R2 SQL" — same permissions.',
  ];
}
