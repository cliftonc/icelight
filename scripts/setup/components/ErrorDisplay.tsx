/**
 * Error display component
 * Shows error message and exits
 */

import React, { useEffect } from 'react';
import { Box, Text } from 'ink';
import boxen from 'boxen';
import chalk from 'chalk';
import { colors } from '../core/colors.js';

interface ErrorDisplayProps {
  error: Error;
  onExit: () => void;
}

export function ErrorDisplay({
  error,
  onExit,
}: ErrorDisplayProps): React.ReactElement {
  // Auto-exit after showing error
  useEffect(() => {
    const timer = setTimeout(() => {
      onExit();
    }, 100);
    return () => clearTimeout(timer);
  }, [onExit]);

  const titleBox = boxen(chalk.hex(colors.error)('Setup Failed'), {
    padding: { left: 2, right: 2, top: 0, bottom: 0 },
    borderColor: colors.error,
    borderStyle: 'round',
  });

  return (
    <Box flexDirection="column">
      <Text>{titleBox}</Text>
      <Box marginTop={1} marginLeft={2}>
        <Text color="red">{error.message}</Text>
      </Box>
    </Box>
  );
}
