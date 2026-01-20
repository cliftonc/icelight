/**
 * Authentication check step
 */

import type { AuthInfo } from '../core/types.js';
import { runQuietAsync } from '../core/wrangler.js';

/**
 * Check wrangler authentication status
 * Returns authentication info including email and account ID if available
 * Uses async execution to allow UI updates (spinner animation)
 */
export async function checkWranglerAuth(): Promise<AuthInfo> {
  try {
    const output = await runQuietAsync('wrangler whoami');

    if (!output || output.includes('You are not authenticated')) {
      return { authenticated: false };
    }

    const result: AuthInfo = { authenticated: true };

    // Extract email
    const emailMatch = output.match(/associated with the email ([^\s]+)/);
    if (emailMatch) {
      result.email = emailMatch[1];
    }

    // Try to extract account ID from whoami output
    const accountMatch = output.match(/Account ID[:\s]+([a-f0-9]{32})/i);
    if (accountMatch) {
      result.accountId = accountMatch[1];
    } else {
      // Try alternative: get from wrangler whoami --account
      const accountsOutput = await runQuietAsync('wrangler whoami --account');
      if (accountsOutput) {
        const idMatch = accountsOutput.match(/([a-f0-9]{32})/i);
        if (idMatch) {
          result.accountId = idMatch[1];
        }
      }
    }

    return result;
  } catch {
    return { authenticated: false };
  }
}

/**
 * Get instructions for logging in
 */
export function getLoginInstructions(): string[] {
  return [
    'Please run the following command to authenticate:',
    '  wrangler login',
    '',
    'This will open a browser window to authorize wrangler.',
    'After logging in, run this setup script again.',
  ];
}
