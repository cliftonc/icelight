/**
 * Single task row component
 * Displays task status icon, title, and optional message
 */

import React from 'react';
import { Box, Text } from 'ink';
import { StatusIcon, TaskStatus } from './StatusIcon.js';

interface TaskProps {
  title: string;
  status: TaskStatus;
  message?: string;
}

export function Task({ title, status, message }: TaskProps): React.ReactElement {
  return (
    <Box>
      <StatusIcon status={status} />
      <Text> {title}</Text>
      {message && <Text color="gray"> ({message})</Text>}
    </Box>
  );
}
