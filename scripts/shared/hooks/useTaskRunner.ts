/**
 * Hook for managing sequential task execution
 * Provides state management for task status tracking
 */

import { useState, useCallback } from 'react';
import type { TaskStatus } from '../components/StatusIcon.js';

export interface TaskState {
  status: TaskStatus;
  message?: string;
  title: string;
}

export interface UseTaskRunnerOptions {
  exitOnError?: boolean;
}

export interface UseTaskRunnerResult {
  taskStates: Map<string, TaskState>;
  isComplete: boolean;
  error: Error | null;
  currentTaskIndex: number;
  updateTaskState: (key: string, status: TaskStatus, message?: string) => void;
  setCurrentIndex: (index: number) => void;
  setError: (error: Error | null) => void;
  setComplete: (complete: boolean) => void;
}

/**
 * Hook for managing task runner state
 */
export function useTaskRunner(
  initialTasks: Array<{ key: string; title: string }>
): UseTaskRunnerResult {
  const [taskStates, setTaskStates] = useState<Map<string, TaskState>>(() => {
    const initial = new Map<string, TaskState>();
    for (const task of initialTasks) {
      initial.set(task.key, { status: 'pending', title: task.title });
    }
    return initial;
  });

  const [currentTaskIndex, setCurrentIndex] = useState(0);
  const [isComplete, setComplete] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const updateTaskState = useCallback(
    (key: string, status: TaskStatus, message?: string) => {
      setTaskStates((prev) => {
        const next = new Map(prev);
        const existing = prev.get(key);
        next.set(key, {
          status,
          message,
          title: existing?.title || key,
        });
        return next;
      });
    },
    []
  );

  return {
    taskStates,
    isComplete,
    error,
    currentTaskIndex,
    updateTaskState,
    setCurrentIndex,
    setError,
    setComplete,
  };
}
