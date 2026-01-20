/**
 * Banner component using figlet
 * Wraps the existing banner functionality for Ink
 */

import React from 'react';
import { Box, Text } from 'ink';
import figlet from 'figlet';
import chalk from 'chalk';

type FigletFont = 'Standard' | 'Big' | 'Slant' | 'Small';

interface BannerProps {
  text: string;
  gradient?: string[];
  subtitle?: string;
  font?: FigletFont;
}

/**
 * Apply gradient coloring to multi-line text
 */
function applyGradient(text: string, colors: string[]): string {
  const lines = text.split('\n');
  const totalLines = lines.length;

  return lines
    .map((line, index) => {
      const colorIndex = Math.floor((index / totalLines) * colors.length);
      const color = colors[Math.min(colorIndex, colors.length - 1)];
      return chalk.hex(color)(line);
    })
    .join('\n');
}

/**
 * Default ice-themed gradient (cyan -> blue -> purple)
 */
const defaultGradient = [
  '#67e8f9', // cyan-300
  '#22d3ee', // cyan-400
  '#06b6d4', // cyan-500
  '#0ea5e9', // sky-500
  '#3b82f6', // blue-500
  '#8b5cf6', // violet-500
];

/**
 * Warning gradient (red -> orange -> yellow)
 */
export const warningGradient = [
  '#ef4444', // red-500
  '#f97316', // orange-500
  '#f59e0b', // amber-500
  '#eab308', // yellow-500
  '#facc15', // yellow-400
];

export function Banner({
  text,
  gradient = defaultGradient,
  subtitle,
  font: preferredFont,
}: BannerProps): React.ReactElement {
  let ascii = '';

  try {
    // If a specific font is requested, try it first
    const fonts: FigletFont[] = preferredFont
      ? [preferredFont, 'Standard', 'Big', 'Slant', 'Small']
      : ['Standard', 'Big', 'Slant', 'Small'];

    for (const font of fonts) {
      try {
        ascii = figlet.textSync(text, {
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
  } catch {
    // Fallback to simple text if figlet fails
    ascii = text;
  }

  const coloredAscii = applyGradient(ascii || text, gradient);

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text>{coloredAscii}</Text>
      {subtitle && <Text color="gray">  {subtitle}</Text>}
    </Box>
  );
}
