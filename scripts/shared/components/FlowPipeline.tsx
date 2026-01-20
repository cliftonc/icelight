/**
 * FlowPipeline component
 * Displays a horizontal progress indicator showing phase status
 */

import React from 'react';
import { Box, Text } from 'ink';
import type { GroupStatus } from './FlowGroup.js';

export interface FlowPhase {
  key: string;
  title: string;
  status: GroupStatus;
}

interface FlowPipelineProps {
  phases: FlowPhase[];
}

/**
 * Get the color for a phase based on its status
 */
function getPhaseColor(status: GroupStatus): string {
  switch (status) {
    case 'active':
      return 'cyan';
    case 'complete':
      return 'green';
    case 'error':
      return 'red';
    case 'pending':
    default:
      return 'gray';
  }
}

/**
 * Get the icon for a phase based on its status
 */
function getPhaseIcon(status: GroupStatus): string {
  switch (status) {
    case 'active':
      return '◉';
    case 'complete':
      return '●';
    case 'error':
      return '✗';
    case 'pending':
    default:
      return '○';
  }
}

export function FlowPipeline({ phases }: FlowPipelineProps): React.ReactElement {
  return (
    <Box marginBottom={1}>
      {phases.map((phase, index) => (
        <Box key={phase.key}>
          {/* Phase indicator */}
          <Text color={getPhaseColor(phase.status)}>
            {getPhaseIcon(phase.status)} {phase.title}
          </Text>

          {/* Arrow connector (not after last phase) */}
          {index < phases.length - 1 && (
            <Text color="gray"> → </Text>
          )}
        </Box>
      ))}
    </Box>
  );
}
