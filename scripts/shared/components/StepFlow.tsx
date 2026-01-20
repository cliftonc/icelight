/**
 * StepFlow component
 * Orchestrates grouped task execution with visual flow representation
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Box } from 'ink';
import { FlowPipeline, FlowPhase } from './FlowPipeline.js';
import { FlowGroup, FlowTaskState, GroupStatus } from './FlowGroup.js';
import type { TaskStatus } from './StatusIcon.js';

export interface FlowGroupDefinition {
  key: string;
  title: string;
}

export interface FlowTaskDefinition<T = unknown> {
  key: string;
  title: string;
  group: string;
  task: (context: T) => Promise<void>;
  skip?: (context: T) => boolean | string;
}

interface TaskState {
  status: TaskStatus;
  message?: string;
}

interface StepFlowProps<T> {
  groups: FlowGroupDefinition[];
  tasks: FlowTaskDefinition<T>[];
  context: T;
  onComplete?: (error?: Error) => void;
  exitOnError?: boolean;
  showCompletedGroups?: boolean;
}

/**
 * Derive group status from task states
 */
function deriveGroupStatus<T>(
  groupKey: string,
  tasks: FlowTaskDefinition<T>[],
  taskStates: Map<string, TaskState>
): GroupStatus {
  const groupTasks = tasks.filter((t) => t.group === groupKey);
  if (groupTasks.length === 0) return 'pending';

  const states = groupTasks.map((t) => taskStates.get(t.key)?.status || 'pending');

  // If any task has an error, the group is in error state
  if (states.some((s) => s === 'error')) return 'error';

  // If any task is running, the group is active
  if (states.some((s) => s === 'running')) return 'active';

  // If all tasks are complete (success or skipped), the group is complete
  const allComplete = states.every((s) => s === 'success' || s === 'skipped');
  if (allComplete) return 'complete';

  // If some tasks are pending and some complete, the group is active
  const hasComplete = states.some((s) => s === 'success' || s === 'skipped');
  if (hasComplete) return 'active';

  return 'pending';
}

/**
 * Get the current active group (first non-complete group)
 */
function getCurrentGroupKey<T>(
  groups: FlowGroupDefinition[],
  tasks: FlowTaskDefinition<T>[],
  taskStates: Map<string, TaskState>
): string | null {
  for (const group of groups) {
    const status = deriveGroupStatus(group.key, tasks, taskStates);
    if (status !== 'complete') {
      return group.key;
    }
  }
  return null;
}

export function StepFlow<T>({
  groups,
  tasks,
  context,
  onComplete,
  exitOnError = true,
  showCompletedGroups = true,
}: StepFlowProps<T>): React.ReactElement {
  const [taskStates, setTaskStates] = useState<Map<string, TaskState>>(() => {
    const initial = new Map<string, TaskState>();
    for (const task of tasks) {
      initial.set(task.key, { status: 'pending' });
    }
    return initial;
  });
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const completionCalledRef = useRef(false);
  const isRunningRef = useRef(false);

  // Refs for tasks and context - stable across renders to prevent infinite loops
  const tasksRef = useRef(tasks);
  const contextRef = useRef(context);

  // Sync refs on prop change (separate effect, doesn't trigger task execution)
  useEffect(() => {
    tasksRef.current = tasks;
    contextRef.current = context;
  }, [tasks, context]);

  // Run tasks sequentially - uses refs for tasks/context to prevent render loops
  useEffect(() => {
    // Guard against re-entry while a task is running
    if (isRunningRef.current || isComplete || currentTaskIndex >= tasksRef.current.length) {
      return;
    }

    const currentTask = tasksRef.current[currentTaskIndex];
    if (!currentTask) {
      // Let the dedicated completion effect handle this case
      return;
    }

    const runTask = async () => {
      // Set running flag to prevent re-entry
      isRunningRef.current = true;

      try {
        // Check if task should be skipped
        if (currentTask.skip) {
          const skipResult = currentTask.skip(contextRef.current);
          if (skipResult) {
            const skipMessage = typeof skipResult === 'string' ? skipResult : 'Skipped';
            setTaskStates((prev) => {
              const next = new Map(prev);
              next.set(currentTask.key, { status: 'skipped', message: skipMessage });
              return next;
            });
            isRunningRef.current = false;
            setCurrentTaskIndex((i) => i + 1);
            return;
          }
        }

        // Mark as running
        setTaskStates((prev) => {
          const next = new Map(prev);
          next.set(currentTask.key, { status: 'running' });
          return next;
        });

        await currentTask.task(contextRef.current);
        setTaskStates((prev) => {
          const next = new Map(prev);
          next.set(currentTask.key, { status: 'success' });
          return next;
        });
        isRunningRef.current = false;
        setCurrentTaskIndex((i) => i + 1);
      } catch (err) {
        const taskError = err instanceof Error ? err : new Error(String(err));
        setTaskStates((prev) => {
          const next = new Map(prev);
          next.set(currentTask.key, { status: 'error', message: taskError.message });
          return next;
        });
        setError(taskError);
        isRunningRef.current = false;

        if (exitOnError) {
          if (!completionCalledRef.current) {
            completionCalledRef.current = true;
            setIsComplete(true);
            onComplete?.(taskError);
          }
        } else {
          setCurrentTaskIndex((i) => i + 1);
        }
      }
    };

    runTask();
  }, [currentTaskIndex, isComplete, exitOnError, onComplete]);

  // Check for completion - uses ref to avoid render loop
  useEffect(() => {
    if (!isComplete && currentTaskIndex >= tasksRef.current.length && !error) {
      if (!completionCalledRef.current) {
        completionCalledRef.current = true;
        setIsComplete(true);
        onComplete?.();
      }
    }
  }, [currentTaskIndex, isComplete, error, onComplete]);

  // Build phase data for pipeline display
  const phases: FlowPhase[] = groups.map((group) => ({
    key: group.key,
    title: group.title,
    status: deriveGroupStatus(group.key, tasks, taskStates),
  }));

  // Build task state data for each group
  const getGroupTasks = useCallback(
    (groupKey: string): FlowTaskState[] => {
      return tasks
        .filter((t) => t.group === groupKey)
        .map((t) => {
          const state = taskStates.get(t.key) || { status: 'pending' as TaskStatus };
          return {
            key: t.key,
            title: t.title,
            status: state.status,
            message: state.message,
          };
        });
    },
    [tasks, taskStates]
  );

  // Determine which groups to show
  const currentGroupKey = getCurrentGroupKey(groups, tasks, taskStates);
  const groupsToShow = showCompletedGroups
    ? groups.filter((g) => {
        const status = deriveGroupStatus(g.key, tasks, taskStates);
        return status !== 'pending' || g.key === currentGroupKey;
      })
    : groups.filter((g) => g.key === currentGroupKey);

  return (
    <Box flexDirection="column">
      {/* Horizontal pipeline progress */}
      <FlowPipeline phases={phases} />

      {/* Group boxes */}
      {groupsToShow.map((group) => (
        <Box key={group.key} marginBottom={1}>
          <FlowGroup
            title={group.title}
            status={deriveGroupStatus(group.key, tasks, taskStates)}
            tasks={getGroupTasks(group.key)}
          />
        </Box>
      ))}
    </Box>
  );
}
