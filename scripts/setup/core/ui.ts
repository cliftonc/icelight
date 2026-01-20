/**
 * UI utilities using chalk and boxen for beautiful terminal output
 * Uses centralized colors from ./colors.ts
 */

import boxen from 'boxen';
import { colors, c, symbols as brandSymbols } from './colors.js';

// Re-export symbols for convenience
export const symbols = brandSymbols;

// Re-export style helpers
export const style = c;

/**
 * Create a section box with title
 */
export function sectionBox(
  title: string,
  type: 'info' | 'success' | 'warning' | 'error' = 'info'
): string {
  const borderColors = {
    info: colors.accent,
    success: colors.success,
    warning: colors.warning,
    error: colors.error,
  };

  return boxen(c.header(title), {
    padding: { left: 2, right: 2, top: 0, bottom: 0 },
    borderColor: borderColors[type],
    borderStyle: 'round',
  });
}

/**
 * Create a header box for major sections
 */
export function headerBox(title: string, subtitle?: string): string {
  const content = subtitle
    ? `${c.header(title)}\n${c.muted(subtitle)}`
    : c.header(title);

  return boxen(content, {
    padding: 1,
    borderColor: colors.primary,
    borderStyle: 'double',
    textAlignment: 'center',
  });
}

/**
 * Create a success box
 */
export function successBox(title: string, content?: string): string {
  const fullContent = content
    ? `${c.success(title)}\n\n${content}`
    : c.success(title);

  return boxen(fullContent, {
    padding: 1,
    borderColor: colors.success,
    borderStyle: 'round',
    title: symbols.success,
    titleAlignment: 'left',
  });
}

/**
 * Format a resource status line with consistent indentation
 */
export function resourceLine(exists: boolean, id?: string | null): string {
  const status = exists ? symbols.success : symbols.pending;
  const statusText = exists ? 'Exists' : 'Not created';
  const idText = id ? c.dim(` (${id})`) : '';
  return `    ${status} ${statusText}${idText}`;
}

/**
 * Format a configuration line
 */
export function configLine(label: string, value: string): string {
  return `    ${c.label(label + ':')} ${c.value(value)}`;
}

/**
 * Format a key-value pair for display
 */
export function kvLine(key: string, value: string, indent = 2): string {
  const padding = ' '.repeat(indent);
  return `${padding}${c.accent(key)}: ${value}`;
}

/**
 * Format a list item
 */
export function listItem(text: string, indent = 2): string {
  const padding = ' '.repeat(indent);
  return `${padding}${symbols.bullet} ${text}`;
}

/**
 * Format a numbered step
 */
export function stepLine(number: number, text: string): string {
  return `  ${c.accent(`${number}.`)} ${text}`;
}

/**
 * Print a blank line
 */
export function blank(): void {
  console.log();
}

/**
 * Print a divider line
 */
export function divider(char = '─', length = 60): void {
  console.log(c.dim(char.repeat(length)));
}

/**
 * Log with optional color styling
 */
export function log(message: string): void {
  console.log(message);
}

/**
 * Log a success message
 */
export function logSuccess(message: string): void {
  console.log(`${symbols.success} ${message}`);
}

/**
 * Log an error message
 */
export function logError(message: string): void {
  console.log(`${symbols.error} ${c.error(message)}`);
}

/**
 * Log a warning message
 */
export function logWarning(message: string): void {
  console.log(`${symbols.warning} ${c.warning(message)}`);
}

/**
 * Log an info message
 */
export function logInfo(message: string): void {
  console.log(`${symbols.info} ${message}`);
}

/**
 * Log a step being executed
 */
export function logStep(message: string): void {
  console.log(`${symbols.arrow} ${message}`);
}
