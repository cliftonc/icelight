/**
 * Sequential task runner component
 * Runs tasks one by one and displays their status
 */

import React, { useEffect, useState } from 'react';
import { Box } from 'ink';
import { Task } from './Task.js';
import type { TaskStatus } from './StatusIcon.js';

export interface TaskDefinition<T = unknown> {
  key: string;
  title: string;
  task: (context: T) => Promise<void>;
  skip?: (context: T) => boolean | string;
}

interface TaskState {
  status: TaskStatus;
  message?: string;
}

interface TaskListProps<T> {
  tasks: TaskDefinition<T>[];
  context: T;
  onComplete?: (error?: Error) => void;
  exitOnError?: boolean;
}

export function TaskList<T>({
  tasks,
  context,
  onComplete,
  exitOnError = true,
}: TaskListProps<T>): React.ReactElement {
  const [taskStates, setTaskStates] = useState<Map<string, TaskState>>(() => {
    const initial = new Map<string, TaskState>();
    for (const task of tasks) {
      initial.set(task.key, { status: 'pending' });
    }
    return initial;
  });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (isComplete || currentIndex >= tasks.length) {
      return;
    }

    const currentTask = tasks[currentIndex];
    if (!currentTask) {
      setIsComplete(true);
      onComplete?.();
      return;
    }

    const runTask = async () => {
      // Check if task should be skipped
      if (currentTask.skip) {
        const skipResult = currentTask.skip(context);
        if (skipResult) {
          const skipMessage = typeof skipResult === 'string' ? skipResult : 'Skipped';
          setTaskStates((prev) => {
            const next = new Map(prev);
            next.set(currentTask.key, { status: 'skipped', message: skipMessage });
            return next;
          });
          setCurrentIndex((i) => i + 1);
          return;
        }
      }

      // Mark as running
      setTaskStates((prev) => {
        const next = new Map(prev);
        next.set(currentTask.key, { status: 'running' });
        return next;
      });

      try {
        await currentTask.task(context);
        setTaskStates((prev) => {
          const next = new Map(prev);
          next.set(currentTask.key, { status: 'success' });
          return next;
        });
        setCurrentIndex((i) => i + 1);
      } catch (err) {
        const taskError = err instanceof Error ? err : new Error(String(err));
        setTaskStates((prev) => {
          const next = new Map(prev);
          next.set(currentTask.key, { status: 'error', message: taskError.message });
          return next;
        });
        setError(taskError);

        if (exitOnError) {
          setIsComplete(true);
          onComplete?.(taskError);
        } else {
          setCurrentIndex((i) => i + 1);
        }
      }
    };

    runTask();
  }, [currentIndex, tasks, context, isComplete, exitOnError, onComplete]);

  // Check for completion
  useEffect(() => {
    if (!isComplete && currentIndex >= tasks.length && !error) {
      setIsComplete(true);
      onComplete?.();
    }
  }, [currentIndex, tasks.length, isComplete, error, onComplete]);

  return (
    <Box flexDirection="column">
      {tasks.map((task) => {
        const state = taskStates.get(task.key) || { status: 'pending' };
        return (
          <Task
            key={task.key}
            title={task.title}
            status={state.status}
            message={state.message}
          />
        );
      })}
    </Box>
  );
}
