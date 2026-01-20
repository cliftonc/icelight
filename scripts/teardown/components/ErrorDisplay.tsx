/**
 * Error display component for teardown
 */

import React, { useEffect } from 'react';
import { Box, Text } from 'ink';
import boxen from 'boxen';
import chalk from 'chalk';

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

  const titleBox = boxen(chalk.hex('#ef4444')('Teardown Failed'), {
    padding: { left: 2, right: 2, top: 0, bottom: 0 },
    borderColor: '#ef4444',
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
