/**
 * Interactive prompts using @inquirer/prompts
 */

import { input, confirm, password } from '@inquirer/prompts';
import chalk from 'chalk';

/**
 * Prompt for project name with default value
 */
export async function promptProjectName(savedName: string): Promise<string> {
  const result = await input({
    message: 'Project name',
    default: savedName,
    theme: {
      prefix: chalk.cyan('?'),
    },
  });
  return result.trim() || savedName;
}

/**
 * Prompt for API token (masked input)
 */
export async function promptApiToken(): Promise<string> {
  const result = await password({
    message: 'API Token',
    mask: '*',
    theme: {
      prefix: chalk.cyan('?'),
    },
  });
  return result.trim();
}

/**
 * Prompt for confirmation to redeploy a worker
 */
export async function promptRedeploy(workerName: string): Promise<boolean> {
  return confirm({
    message: `${workerName} is already deployed. Redeploy?`,
    default: false,
    theme: {
      prefix: chalk.yellow('?'),
    },
  });
}

/**
 * Prompt for yes/no confirmation
 */
export async function promptConfirm(message: string, defaultValue = false): Promise<boolean> {
  return confirm({
    message,
    default: defaultValue,
    theme: {
      prefix: chalk.cyan('?'),
    },
  });
}

/**
 * Prompt for text input
 */
export async function promptInput(message: string, defaultValue?: string): Promise<string> {
  const result = await input({
    message,
    default: defaultValue,
    theme: {
      prefix: chalk.cyan('?'),
    },
  });
  return result.trim();
}
