/**
 * FlowGroup component
 * Displays a group of tasks within a box-drawing border
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Task } from './Task.js';
import type { TaskStatus } from './StatusIcon.js';

export type GroupStatus = 'pending' | 'active' | 'complete' | 'error';

export interface FlowTaskState {
  key: string;
  title: string;
  status: TaskStatus;
  message?: string;
}

interface FlowGroupProps {
  title: string;
  status: GroupStatus;
  tasks: FlowTaskState[];
  minWidth?: number;
}

/**
 * Get the color for the group border based on status
 */
function getBorderColor(status: GroupStatus): string {
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
 * Get the status icon for the group title
 */
function getGroupIcon(status: GroupStatus): string {
  switch (status) {
    case 'active':
      return '◉';
    case 'complete':
      return '✓';
    case 'error':
      return '✗';
    case 'pending':
    default:
      return '○';
  }
}

export function FlowGroup({
  title,
  status,
  tasks,
  minWidth = 50,
}: FlowGroupProps): React.ReactElement {
  const borderColor = getBorderColor(status);
  const icon = getGroupIcon(status);

  // Calculate the width needed for the content
  const maxTaskLength = Math.max(
    ...tasks.map((t) => t.title.length + (t.message ? t.message.length + 3 : 0) + 2),
    title.length + 4
  );
  const contentWidth = Math.max(maxTaskLength, minWidth);

  // Box drawing characters
  const topLeft = '┌';
  const topRight = '┐';
  const bottomLeft = '└';
  const bottomRight = '┘';
  const horizontal = '─';
  const vertical = '│';

  // Build the title line with box drawing
  const titleWithIcon = `${icon} ${title} `;
  const titlePadding = contentWidth - titleWithIcon.length;
  const topBorder = `${topLeft}${horizontal} ${titleWithIcon}${horizontal.repeat(Math.max(0, titlePadding))}${topRight}`;
  const bottomBorder = `${bottomLeft}${horizontal.repeat(contentWidth + 2)}${bottomRight}`;

  return (
    <Box flexDirection="column">
      {/* Top border with title */}
      <Text color={borderColor}>{topBorder}</Text>

      {/* Task rows */}
      {tasks.map((task) => (
        <Box key={task.key}>
          <Text color={borderColor}>{vertical} </Text>
          <Box width={contentWidth}>
            <Task title={task.title} status={task.status} message={task.message} />
          </Box>
          <Text color={borderColor}> {vertical}</Text>
        </Box>
      ))}

      {/* Empty state */}
      {tasks.length === 0 && (
        <Box>
          <Text color={borderColor}>{vertical} </Text>
          <Box width={contentWidth}>
            <Text color="gray">(no tasks)</Text>
          </Box>
          <Text color={borderColor}> {vertical}</Text>
        </Box>
      )}

      {/* Bottom border */}
      <Text color={borderColor}>{bottomBorder}</Text>
    </Box>
  );
}
