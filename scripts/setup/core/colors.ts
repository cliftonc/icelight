/**
 * Centralized color palette for icelight branding
 * All colors defined once, used everywhere via semantic aliases
 */

import chalk from 'chalk';

/**
 * Brand color palette - hex values
 */
const palette = {
  // Primary gradient (purple -> blue -> cyan)
  violet400: '#c084fc',
  violet500: '#a855f7',
  violet600: '#7c3aed',
  indigo500: '#6366f1',
  blue500: '#3b82f6',
  sky500: '#0ea5e9',
  cyan500: '#06b6d4',

  // Neutrals
  gray400: '#9ca3af',
  gray500: '#6b7280',
  gray600: '#4b5563',

  // Status
  green500: '#22c55e',
  yellow500: '#eab308',
  red500: '#ef4444',

  // Light accents
  indigo100: '#e0e7ff',
  white: '#ffffff',
};

/**
 * Semantic color aliases - use these throughout the app
 */
export const colors = {
  // Brand
  primary: palette.violet500,
  secondary: palette.blue500,
  accent: palette.cyan500,

  // Text
  text: palette.gray400,
  textMuted: palette.gray500,
  textDim: palette.gray600,
  textBright: palette.white,

  // Headers & emphasis
  header: palette.violet500,
  subheader: palette.blue500,

  // Status indicators
  success: palette.green500,
  warning: palette.yellow500,
  error: palette.red500,
  info: palette.cyan500,
  pending: palette.yellow500,

  // UI elements
  border: palette.violet500,
  borderMuted: palette.gray500,
  highlight: palette.indigo100,
};

/**
 * Gradient colors for ASCII art banners (top to bottom)
 */
export const gradientColors = [
  palette.violet400,
  palette.violet500,
  palette.violet600,
  palette.indigo500,
  palette.blue500,
  palette.sky500,
  palette.cyan500,
];

/**
 * Pre-configured chalk functions for common use cases
 */
export const c = {
  // Brand styling
  primary: (text: string) => chalk.hex(colors.primary)(text),
  secondary: (text: string) => chalk.hex(colors.secondary)(text),
  accent: (text: string) => chalk.hex(colors.accent)(text),

  // Text styling
  text: (text: string) => chalk.hex(colors.text)(text),
  muted: (text: string) => chalk.hex(colors.textMuted)(text),
  dim: (text: string) => chalk.hex(colors.textDim)(text),
  bright: (text: string) => chalk.hex(colors.textBright)(text),

  // Headers
  header: (text: string) => chalk.hex(colors.header).bold(text),
  subheader: (text: string) => chalk.hex(colors.subheader)(text),

  // Status
  success: (text: string) => chalk.hex(colors.success)(text),
  warning: (text: string) => chalk.hex(colors.warning)(text),
  error: (text: string) => chalk.hex(colors.error)(text),
  info: (text: string) => chalk.hex(colors.info)(text),

  // Special
  url: (text: string) => chalk.hex(colors.accent).underline(text),
  command: (text: string) => chalk.hex(colors.textDim)(`$ ${text}`),
  value: (text: string) => chalk.hex(colors.textBright).bold(text),
  label: (text: string) => chalk.hex(colors.textMuted)(text),
};

/**
 * Status symbols with brand colors
 */
export const symbols = {
  success: chalk.hex(colors.success)('✓'),
  error: chalk.hex(colors.error)('✗'),
  warning: chalk.hex(colors.warning)('⚠'),
  pending: chalk.hex(colors.pending)('○'),
  info: chalk.hex(colors.info)('ℹ'),
  arrow: chalk.hex(colors.accent)('→'),
  bullet: chalk.hex(colors.textMuted)('•'),
};

/**
 * Apply gradient coloring to multi-line text
 */
export function applyGradient(text: string): string {
  const lines = text.split('\n');
  const totalLines = lines.length;

  return lines.map((line, index) => {
    const colorIndex = Math.floor((index / totalLines) * gradientColors.length);
    const color = gradientColors[Math.min(colorIndex, gradientColors.length - 1)];
    return chalk.hex(color)(line);
  }).join('\n');
}
