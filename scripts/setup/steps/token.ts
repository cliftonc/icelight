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
  return savedEnv.CDPFLARE_API_TOKEN || '';
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
    saveToEnvFile('CDPFLARE_API_TOKEN', token);
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
    'An API token is needed for Data Catalog and worker secrets.',
    'Required permissions:',
    '  • Account → Workers R2 Storage → Edit',
    '  • Account → Workers R2 Data Catalog → Edit',
    '  • Account → Workers R2 SQL → Read',
    '  • Account → Workers Scripts → Read',
    '',
    'Create a token at: https://dash.cloudflare.com/profile/api-tokens',
  ];
}
