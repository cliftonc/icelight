/**
 * Wrangler command execution utilities
 */

import { execSync, spawn } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { CommandResult, WorkerStatus } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Get path to templates directory
 */
export function getTemplatesPath(): string {
  return join(__dirname, '..', '..', '..', 'templates');
}

/**
 * Get path to workers directory
 */
export function getWorkersPath(): string {
  return join(__dirname, '..', '..', '..', 'workers');
}

/**
 * Get path to scripts directory
 */
export function getScriptsPath(): string {
  return join(__dirname, '..', '..');
}

/**
 * Run a command quietly (no output), return stdout or null on error
 */
export function runQuiet(command: string): string | null {
  try {
    return execSync(command, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch {
    return null;
  }
}

/**
 * Extract worker URL from wrangler deploy output
 */
export function extractWorkerUrl(output: string): string | null {
  const match = output.match(/https:\/\/[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev/i);
  return match ? match[0] : null;
}

/**
 * Environment variables to disable wrangler's interactive output
 * This prevents wrangler from using terminal control codes that interfere with listr2
 */
const nonInteractiveEnv = {
  ...process.env,
  CI: 'true',
  NO_COLOR: '1',
  FORCE_COLOR: '0',
  TERM: 'dumb',
};

/**
 * Run a command quietly and asynchronously, return stdout or null on error
 * This allows the event loop to continue (spinners animate)
 * @param command - The command to run
 * @param timeoutMs - Optional timeout in milliseconds (default: 60000)
 */
export function runQuietAsync(command: string, timeoutMs = 60000): Promise<string | null> {
  return new Promise((resolve) => {
    const child = spawn('sh', ['-c', command], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: nonInteractiveEnv,
    });
    let stdout = '';
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
    }, timeoutMs);

    child.stdout?.on('data', (data: Buffer) => {
      stdout += data.toString();
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (timedOut) {
        resolve(null);
      } else {
        resolve(code === 0 ? stdout : null);
      }
    });
    child.on('error', () => {
      clearTimeout(timer);
      resolve(null);
    });
  });
}

/**
 * Run a command asynchronously and return success status
 * This allows the event loop to continue (spinners animate)
 * Important: We must consume stdout/stderr to prevent buffer blocking and output leaking
 */
export function runCommandAsync(command: string): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn('sh', ['-c', command], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: nonInteractiveEnv,
    });
    // Consume stdout/stderr to prevent buffer blocking and output leaking to terminal
    child.stdout?.on('data', () => {});
    child.stderr?.on('data', () => {});
    child.on('close', (code) => resolve(code === 0));
    child.on('error', () => resolve(false));
  });
}

/**
 * Run a command asynchronously and return both success status and output
 * This allows the event loop to continue (spinners animate)
 * @param command - The command to run
 * @param timeoutMs - Optional timeout in milliseconds (default: 120000 for container deploys)
 */
export function runCommandWithOutputAsync(command: string, timeoutMs = 120000): Promise<CommandResult> {
  return new Promise((resolve) => {
    const child = spawn('sh', ['-c', command], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: nonInteractiveEnv,
    });
    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
    }, timeoutMs);

    child.stdout?.on('data', (data: Buffer) => {
      stdout += data.toString();
    });
    child.stderr?.on('data', (data: Buffer) => {
      stderr += data.toString();
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (timedOut) {
        resolve({ success: false, output: `Command timed out after ${timeoutMs}ms` });
      } else {
        // Always return combined output - wrangler outputs to both streams
        // and non-zero exit codes don't always mean failure (especially for containers)
        const combined = stdout + (stderr ? '\n' + stderr : '');
        resolve({ success: code === 0, output: combined });
      }
    });
    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({ success: false, output: err.message });
    });
  });
}

/**
 * Set a secret for a worker asynchronously
 * This allows the event loop to continue (spinners animate)
 */
export function setSecretAsync(name: string, value: string, configPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn('npx', ['wrangler', 'secret', 'put', name, '--config', configPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: nonInteractiveEnv,
    });
    // Consume stdout/stderr to prevent buffer blocking
    child.stdout?.on('data', () => {});
    child.stderr?.on('data', () => {});
    child.stdin?.write(value);
    child.stdin?.end();
    child.on('close', (code) => resolve(code === 0));
    child.on('error', () => resolve(false));
  });
}

// Cache for the subdomain
let cachedSubdomain: string | null = null;

/**
 * Set the cached subdomain (extracted from deploy output)
 */
export function setCachedSubdomain(subdomain: string): void {
  cachedSubdomain = subdomain;
}

/**
 * Get the cached subdomain
 */
export function getCachedSubdomain(): string | null {
  return cachedSubdomain;
}

/**
 * Construct a workers.dev URL from worker name and subdomain
 */
export function constructWorkerUrl(workerName: string, subdomain?: string): string | null {
  const sub = subdomain || cachedSubdomain;
  if (!sub) return null;
  return `https://${workerName}.${sub}.workers.dev`;
}

/**
 * Extract subdomain from a workers.dev URL
 */
export function extractSubdomainFromUrl(url: string): string | null {
  // Pattern: https://worker-name.subdomain.workers.dev
  const match = url.match(/https:\/\/[a-z0-9-]+\.([a-z0-9-]+)\.workers\.dev/i);
  return match ? match[1] : null;
}

/**
 * Check if a worker is deployed (async for spinner animation)
 */
export async function checkWorkerDeployedAsync(workerName: string, subdomain?: string): Promise<WorkerStatus> {
  const output = await runQuietAsync(`wrangler deployments list --name "${workerName}"`);
  if (output && output.includes('Created:')) {
    const sub = subdomain || cachedSubdomain || '<subdomain>';
    const url = `https://${workerName}.${sub}.workers.dev`;
    return { deployed: true, url };
  }
  return { deployed: false, url: null };
}

/**
 * Fetch workers.dev subdomain from Cloudflare API
 */
export async function fetchSubdomainFromApi(accountId: string, apiToken: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/subdomain`,
      {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
    const data = await response.json() as { success: boolean; result?: { subdomain: string } };
    if (data.success && data.result?.subdomain) {
      cachedSubdomain = data.result.subdomain;
      return data.result.subdomain;
    }
  } catch {
    // Ignore errors
  }
  return null;
}

/**
 * Get path to schema file
 */
export function getSchemaPath(): string {
  const schemaPath = join(getTemplatesPath(), 'schema.events.json');
  if (!existsSync(schemaPath)) {
    throw new Error(`Schema file not found: ${schemaPath}`);
  }
  return schemaPath;
}

/**
 * Strip JSON comments and trailing commas to parse JSONC
 */
export function parseJsonc(content: string): unknown {
  // Remove single-line comments
  let stripped = content.replace(/\/\/.*$/gm, '');
  // Remove multi-line comments
  stripped = stripped.replace(/\/\*[\s\S]*?\*\//g, '');
  // Remove trailing commas before } or ]
  stripped = stripped.replace(/,(\s*[}\]])/g, '$1');
  return JSON.parse(stripped);
}

/**
 * Read and parse a wrangler.jsonc config file
 */
export function readWranglerConfig(configPath: string): Record<string, unknown> | null {
  if (!existsSync(configPath)) {
    return null;
  }
  try {
    const content = readFileSync(configPath, 'utf-8');
    return parseJsonc(content) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Write a wrangler local config file with header comment
 */
export function writeWranglerLocalConfig(localPath: string, config: Record<string, unknown>): void {
  const localContent = `// Local wrangler config - DO NOT COMMIT
// Generated by: pnpm launch
// Contains environment-specific values for your Cloudflare account
${JSON.stringify(config, null, 2)}
`;
  writeFileSync(localPath, localContent);
}
