/**
 * Environment file (.env) management utilities
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { SavedEnv } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Path to the project root .env file
 */
export const envFilePath = join(__dirname, '..', '..', '..', '.env');

/**
 * Load environment variables from .env file
 */
export function loadEnvFile(): SavedEnv {
  const env: SavedEnv = {};
  if (existsSync(envFilePath)) {
    const content = readFileSync(envFilePath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const eqIndex = trimmed.indexOf('=');
        if (eqIndex > 0) {
          const key = trimmed.slice(0, eqIndex).trim();
          let value = trimmed.slice(eqIndex + 1).trim();
          // Remove surrounding quotes if present
          if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
          ) {
            value = value.slice(1, -1);
          }
          env[key] = value;
        }
      }
    }
  }
  return env;
}

/**
 * Save or update a value in .env file
 */
export function saveToEnvFile(key: string, value: string): void {
  let content = '';
  let found = false;

  if (existsSync(envFilePath)) {
    const lines = readFileSync(envFilePath, 'utf-8').split('\n');
    const newLines = lines.map((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith(`${key}=`)) {
        found = true;
        return `${key}="${value}"`;
      }
      return line;
    });
    content = newLines.join('\n');
  }

  if (!found) {
    // Add new entry
    if (content && !content.endsWith('\n')) {
      content += '\n';
    }
    content += `${key}="${value}"\n`;
  }

  writeFileSync(envFilePath, content);
}

/**
 * Get a saved environment variable, or return a default value
 */
export function getSavedEnvVar(key: string, defaultValue = ''): string {
  const env = loadEnvFile();
  return env[key] || defaultValue;
}
