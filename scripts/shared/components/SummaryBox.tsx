/**
 * Summary box component using boxen
 * Displays a bordered summary with title and content
 */

import React from 'react';
import { Box, Text } from 'ink';
import boxen from 'boxen';
import chalk from 'chalk';

interface SummaryBoxProps {
  title: string;
  children: React.ReactNode;
  borderColor?: string;
  type?: 'success' | 'warning' | 'error' | 'info';
}

const typeColors = {
  success: '#22c55e', // green-500
  warning: '#f59e0b', // amber-500
  error: '#ef4444', // red-500
  info: '#06b6d4', // cyan-500
};

export function SummaryBox({
  title,
  children,
  borderColor,
  type = 'info',
}: SummaryBoxProps): React.ReactElement {
  const color = borderColor || typeColors[type];

  // Use boxen for the title
  const titleBox = boxen(chalk.hex(color)(title), {
    padding: { left: 2, right: 2, top: 0, bottom: 0 },
    borderColor: color,
    borderStyle: 'round',
  });

  return (
    <Box flexDirection="column" marginY={1}>
      <Text>{titleBox}</Text>
      <Box flexDirection="column" marginLeft={2} marginTop={1}>
        {children}
      </Box>
    </Box>
  );
}

interface KeyValueLineProps {
  label: string;
  value: string;
  color?: string;
}

export function KeyValueLine({
  label,
  value,
  color = 'cyan',
}: KeyValueLineProps): React.ReactElement {
  return (
    <Box>
      <Text color={color}>{label}: </Text>
      <Text>{value}</Text>
    </Box>
  );
}

interface SuccessLineProps {
  text: string;
}

export function SuccessLine({ text }: SuccessLineProps): React.ReactElement {
  return (
    <Box>
      <Text color="green">  ✓ </Text>
      <Text>{text}</Text>
    </Box>
  );
}

interface UrlLineProps {
  label: string;
  url: string;
}

export function UrlLine({ label, url }: UrlLineProps): React.ReactElement {
  return (
    <Box>
      <Text color="gray">  {label}: </Text>
      <Text color="cyan">{url}</Text>
    </Box>
  );
}
