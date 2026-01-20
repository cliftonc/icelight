/**
 * Status icon component for task states
 * Shows spinner while running, checkmark/X for completion
 */

import React from 'react';
import { Text } from 'ink';
import Spinner from 'ink-spinner';

export type TaskStatus = 'pending' | 'running' | 'success' | 'error' | 'skipped';

interface StatusIconProps {
  status: TaskStatus;
}

export function StatusIcon({ status }: StatusIconProps): React.ReactElement {
  switch (status) {
    case 'running':
      return (
        <Text color="cyan">
          <Spinner type="dots" />
        </Text>
      );
    case 'success':
      return <Text color="green">✓</Text>;
    case 'error':
      return <Text color="red">✗</Text>;
    case 'skipped':
      return <Text color="yellow">○</Text>;
    case 'pending':
    default:
      return <Text color="gray">○</Text>;
  }
}
