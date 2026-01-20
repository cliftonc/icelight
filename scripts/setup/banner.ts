/**
 * ASCII art welcome banner using figlet with gradient colors
 * Optimized for modern terminals (Ghostty, iTerm2, Kitty, etc.) with true color support
 */

import figlet from 'figlet';
import chalk from 'chalk';
import { colors, c, applyGradient } from './core/colors.js';

/**
 * Generate ASCII art banner with gradient
 */
export function generateBanner(): string {
  try {
    // Try 'Standard' font first (most reliable), fall back to others
    const fonts = ['Standard', 'Big', 'Slant', 'Small'];
    let ascii = '';

    for (const font of fonts) {
      try {
        ascii = figlet.textSync('icelight', {
          font: font as Parameters<typeof figlet.textSync>[1] extends { font?: infer F } ? F : never,
          horizontalLayout: 'default',
          verticalLayout: 'default',
        });
        if (ascii) break;
      } catch {
        continue;
      }
    }

    if (ascii) {
      return applyGradient(ascii);
    }
    throw new Error('No font worked');
  } catch {
    // Fallback with manual ASCII art if figlet fails
    const fallback = `
  ██╗ ██████╗███████╗██╗     ██╗ ██████╗ ██╗  ██╗████████╗
  ██║██╔════╝██╔════╝██║     ██║██╔════╝ ██║  ██║╚══██╔══╝
  ██║██║     █████╗  ██║     ██║██║  ███╗███████║   ██║
  ██║██║     ██╔══╝  ██║     ██║██║   ██║██╔══██║   ██║
  ██║╚██████╗███████╗███████╗██║╚██████╔╝██║  ██║   ██║
  ╚═╝ ╚═════╝╚══════╝╚══════╝╚═╝ ╚═════╝ ╚═╝  ╚═╝   ╚═╝
`;
    return applyGradient(fallback);
  }
}

/**
 * Generate subtitle with subtle styling
 */
export function generateSubtitle(): string {
  return c.muted('  Cloudflare Data Platform ') +
         c.accent('→') +
         c.muted(' Stream JSON to Iceberg');
}

/**
 * Generate a decorative line
 */
function decorativeLine(): string {
  return chalk.hex(colors.primary)('─'.repeat(58));
}

/**
 * Display the welcome banner with figlet ASCII art
 */
export function displayBanner(): void {
  console.log();
  console.log(generateBanner());
  console.log(generateSubtitle());
  console.log();
}

/**
 * Display a compact header (alternative to full banner)
 */
export function displayHeader(): void {
  console.log();
  console.log(decorativeLine());
  console.log();
  console.log(
    '  ' +
    c.primary('ice') +
    c.secondary('light') +
    c.muted(' Infrastructure Setup')
  );
  console.log(generateSubtitle());
  console.log();
  console.log(decorativeLine());
  console.log();
}

/**
 * Display a simple header without ASCII art (for non-TTY environments)
 */
export function displaySimpleHeader(): void {
  console.log();
  console.log(c.primary('═'.repeat(60)));
  console.log(c.secondary('  icelight Infrastructure Setup'));
  console.log(c.muted('  Cloudflare Data Platform - Stream JSON to Iceberg'));
  console.log(c.primary('═'.repeat(60)));
  console.log();
}
