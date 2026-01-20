/**
 * Warning-themed ASCII art banner for teardown
 * Uses red/yellow/orange gradient to indicate destructive operation
 */

import figlet from 'figlet';
import chalk from 'chalk';

/**
 * Warning color palette (red -> orange -> yellow)
 */
const warningGradient = [
  '#ef4444', // red-500
  '#f97316', // orange-500
  '#f59e0b', // amber-500
  '#eab308', // yellow-500
  '#facc15', // yellow-400
];

/**
 * Apply warning gradient coloring to multi-line text
 */
function applyWarningGradient(text: string): string {
  const lines = text.split('\n');
  const totalLines = lines.length;

  return lines
    .map((line, index) => {
      const colorIndex = Math.floor((index / totalLines) * warningGradient.length);
      const color = warningGradient[Math.min(colorIndex, warningGradient.length - 1)];
      return chalk.hex(color)(line);
    })
    .join('\n');
}

/**
 * Generate ASCII art banner with warning gradient
 */
export function generateBanner(): string {
  try {
    // Try 'Standard' font first (most reliable), fall back to others
    const fonts = ['Standard', 'Big', 'Slant', 'Small'];
    let ascii = '';

    for (const font of fonts) {
      try {
        ascii = figlet.textSync('TEARDOWN', {
          font: font as Parameters<typeof figlet.textSync>[1] extends { font?: infer F }
            ? F
            : never,
          horizontalLayout: 'default',
          verticalLayout: 'default',
        });
        if (ascii) break;
      } catch {
        continue;
      }
    }

    if (ascii) {
      return applyWarningGradient(ascii);
    }
    throw new Error('No font worked');
  } catch {
    // Fallback with manual ASCII art if figlet fails
    const fallback = `
  ████████╗███████╗ █████╗ ██████╗ ██████╗  ██████╗ ██╗    ██╗███╗   ██╗
  ╚══██╔══╝██╔════╝██╔══██╗██╔══██╗██╔══██╗██╔═══██╗██║    ██║████╗  ██║
     ██║   █████╗  ███████║██████╔╝██║  ██║██║   ██║██║ █╗ ██║██╔██╗ ██║
     ██║   ██╔══╝  ██╔══██║██╔══██╗██║  ██║██║   ██║██║███╗██║██║╚██╗██║
     ██║   ███████╗██║  ██║██║  ██║██████╔╝╚██████╔╝╚███╔███╔╝██║ ╚████║
     ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝  ╚═════╝  ╚══╝╚══╝ ╚═╝  ╚═══╝
`;
    return applyWarningGradient(fallback);
  }
}

/**
 * Generate subtitle with warning styling
 */
export function generateSubtitle(): string {
  return (
    chalk.hex('#f59e0b')('  icelight ') +
    chalk.hex('#ef4444')('→') +
    chalk.hex('#f59e0b')(' Infrastructure Teardown')
  );
}

/**
 * Display the warning banner
 */
export function displayBanner(): void {
  console.log();
  console.log(generateBanner());
  console.log(generateSubtitle());
  console.log();
}

/**
 * Display a warning message about destructive operation
 */
export function displayWarning(): void {
  const warningBox =
    chalk.hex('#ef4444')('╔════════════════════════════════════════════════════════════╗') +
    '\n' +
    chalk.hex('#ef4444')('║') +
    chalk.hex('#facc15')('  ⚠ WARNING: This will permanently delete resources!        ') +
    chalk.hex('#ef4444')('║') +
    '\n' +
    chalk.hex('#ef4444')('╚════════════════════════════════════════════════════════════╝');
  console.log(warningBox);
  console.log();
}
