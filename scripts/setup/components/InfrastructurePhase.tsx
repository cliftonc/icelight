/**
 * Infrastructure phase component
 * Creates Cloudflare resources using StepFlow for visual grouping
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import { StepFlow, FlowTaskDefinition, FlowGroupDefinition } from '../../shared/components/index.js';
import type { Config, AuthInfo, ExistingResources } from '../core/types.js';
import { checkExistingResources, getResourcesNeeded, getCatalogInfo } from '../steps/resources.js';
import {
  createBucket,
  enableCatalog,
  createStream,
  createSink,
  createPipeline,
  createKvNamespace,
  createKvPreviewNamespace,
  createD1Database,
} from '../steps/infrastructure.js';

/**
 * Group definitions for visual flow
 */
const INFRASTRUCTURE_GROUPS: FlowGroupDefinition[] = [
  { key: 'storage', title: 'Storage' },
  { key: 'pipeline', title: 'Pipeline' },
  { key: 'cache', title: 'Cache' },
];

interface InfrastructureContext {
  config: Config;
  apiToken: string;
  resources: ExistingResources;
}

interface InfrastructurePhaseProps {
  projectName: string;
  config: Config;
  authInfo: AuthInfo;
  apiToken: string;
  onComplete: (resources: ExistingResources, warehouseName: string, catalogUri: string) => void;
  onError: (error: Error) => void;
}

type Phase = 'checking' | 'creating' | 'refreshing' | 'catalog' | 'done';

export function InfrastructurePhase({
  projectName,
  config,
  authInfo,
  apiToken,
  onComplete,
  onError,
}: InfrastructurePhaseProps): React.ReactElement {
  const [phase, setPhase] = useState<Phase>('checking');
  const [resources, setResources] = useState<ExistingResources | null>(null);
  const [warehouseName, setWarehouseName] = useState('');
  const [catalogUri, setCatalogUri] = useState('');
  const [infraTasks, setInfraTasks] = useState<FlowTaskDefinition<InfrastructureContext>[]>([]);
  const [existingCount, setExistingCount] = useState(0);
  const [allExist, setAllExist] = useState(false);

  // Initial resource check
  useEffect(() => {
    const checkResources = async () => {
      try {
        const existing = await checkExistingResources(config);
        setResources(existing);

        const count = [
          existing.bucket,
          existing.catalogEnabled,
          existing.stream.exists,
          existing.sink.exists,
          existing.pipeline.exists,
          existing.kvCache.exists,
          existing.d1Database.exists,
        ].filter(Boolean).length;
        setExistingCount(count);

        const needs = getResourcesNeeded(existing);
        setAllExist(needs.allExist);

        // Always build task list - tasks will skip if resources already exist
        const tasks = buildInfrastructureTasks(config, existing, needs);
        setInfraTasks(tasks);
        setPhase('creating');
      } catch (err) {
        onError(err instanceof Error ? err : new Error(String(err)));
      }
    };

    checkResources();
  }, [config, onError]);

  // Fetch catalog info
  useEffect(() => {
    if (phase !== 'catalog') return;

    const fetchCatalog = async () => {
      try {
        const catalogInfo = await getCatalogInfo(config.bucketName);
        if (catalogInfo) {
          setWarehouseName(catalogInfo.warehouseName);
          setCatalogUri(catalogInfo.catalogUri);
        }
        setPhase('done');
      } catch {
        // Non-fatal - continue without catalog info
        setPhase('done');
      }
    };

    fetchCatalog();
  }, [phase, config.bucketName]);

  // Complete when done
  useEffect(() => {
    if (phase === 'done' && resources) {
      onComplete(resources, warehouseName, catalogUri);
    }
  }, [phase, resources, warehouseName, catalogUri, onComplete]);

  const handleInfraComplete = useCallback(async (error?: Error) => {
    if (error) {
      onError(error);
      return;
    }

    // Refresh resources after creation
    setPhase('refreshing');
    try {
      const updated = await checkExistingResources(config);
      setResources(updated);
      setPhase('catalog');
    } catch (err) {
      onError(err instanceof Error ? err : new Error(String(err)));
    }
  }, [config, onError]);

  // Memoize context to prevent unnecessary StepFlow re-renders
  const stableContext = useMemo<InfrastructureContext | null>(
    () => resources ? { config, apiToken, resources } : null,
    [config, apiToken, resources]
  );

  return (
    <Box flexDirection="column">
      {phase === 'checking' && (
        <Box>
          <Text color="cyan">
            <Spinner type="dots" />
          </Text>
          <Text> Checking existing resources...</Text>
        </Box>
      )}

      {phase === 'creating' && stableContext && (
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Text color="gray">Found {existingCount} existing resources</Text>
          </Box>
          <StepFlow<InfrastructureContext>
            groups={INFRASTRUCTURE_GROUPS}
            tasks={infraTasks}
            context={stableContext}
            onComplete={handleInfraComplete}
            exitOnError={true}
            showCompletedGroups={true}
          />
        </Box>
      )}

      {phase === 'refreshing' && (
        <Box>
          <Text color="cyan">
            <Spinner type="dots" />
          </Text>
          <Text> Refreshing resource state...</Text>
        </Box>
      )}

      {phase === 'catalog' && (
        <Box>
          <Text color="cyan">
            <Spinner type="dots" />
          </Text>
          <Text> Fetching catalog information...</Text>
        </Box>
      )}

      {allExist && phase === 'catalog' && (
        <Box marginTop={1}>
          <Text color="gray">All infrastructure resources already exist</Text>
        </Box>
      )}
    </Box>
  );
}

/**
 * Build task list based on what's needed with groups
 * Shows all resources with skip indicators for existing ones
 */
function buildInfrastructureTasks(
  config: Config,
  _resources: ExistingResources,
  needs: ReturnType<typeof getResourcesNeeded>
): FlowTaskDefinition<InfrastructureContext>[] {
  const tasks: FlowTaskDefinition<InfrastructureContext>[] = [];

  // Storage group: bucket and catalog
  tasks.push({
    key: 'bucket',
    title: `Create ${config.bucketName}`,
    group: 'storage',
    skip: () => (!needs.needsBucket ? 'Already exists' : false),
    task: async (ctx: InfrastructureContext) => {
      const success = await createBucket(ctx.config.bucketName);
      if (!success) throw new Error('Failed to create R2 bucket');
      ctx.resources.bucket = true;
    },
  });

  tasks.push({
    key: 'catalog',
    title: 'Enable Data Catalog',
    group: 'storage',
    skip: () => (!needs.needsCatalog ? 'Already enabled' : false),
    task: async (ctx: InfrastructureContext) => {
      const success = await enableCatalog(ctx.config.bucketName);
      if (!success) throw new Error('Failed to enable Data Catalog');
      ctx.resources.catalogEnabled = true;
    },
  });

  // Pipeline group: stream, sink, pipeline
  tasks.push({
    key: 'stream',
    title: `Create ${config.streamName}`,
    group: 'pipeline',
    skip: () => (!needs.needsStream ? 'Already exists' : false),
    task: async (ctx: InfrastructureContext) => {
      const success = await createStream(ctx.config.streamName);
      if (!success) throw new Error('Failed to create stream');
      ctx.resources.stream.exists = true;
    },
  });

  tasks.push({
    key: 'sink',
    title: `Create ${config.sinkName}`,
    group: 'pipeline',
    skip: () => (!needs.needsSink ? 'Already exists' : false),
    task: async (ctx: InfrastructureContext) => {
      const success = await createSink(ctx.config.sinkName, ctx.config.bucketName, ctx.apiToken);
      if (!success) throw new Error('Failed to create sink');
      ctx.resources.sink.exists = true;
    },
  });

  tasks.push({
    key: 'pipeline',
    title: `Create ${config.pipelineName}`,
    group: 'pipeline',
    skip: () => (!needs.needsPipeline ? 'Already exists' : false),
    task: async (ctx: InfrastructureContext) => {
      const success = await createPipeline(ctx.config.pipelineName, ctx.config.sinkName, ctx.config.streamName);
      if (!success) throw new Error('Failed to create pipeline');
      ctx.resources.pipeline.exists = true;
    },
  });

  // Cache group: KV and D1
  tasks.push({
    key: 'kv-cache',
    title: `Create ${config.kvCacheName}`,
    group: 'cache',
    skip: () => (!needs.needsKvCache ? 'Already exists' : false),
    task: async (ctx: InfrastructureContext) => {
      const result = await createKvNamespace(ctx.config.kvCacheName);
      if (result.success && result.id) {
        ctx.resources.kvCache.exists = true;
        ctx.resources.kvCache.id = result.id;
      }
    },
  });

  tasks.push({
    key: 'kv-cache-preview',
    title: `Create ${config.kvCacheName}_preview`,
    group: 'cache',
    skip: () => (!needs.needsKvCachePreview ? 'Already exists' : false),
    task: async (ctx: InfrastructureContext) => {
      const result = await createKvPreviewNamespace(ctx.config.kvCacheName);
      if (result.success && result.id) {
        ctx.resources.kvCache.previewId = result.id;
      }
    },
  });

  tasks.push({
    key: 'd1-database',
    title: `Create ${config.d1DatabaseName}`,
    group: 'cache',
    skip: () => (!needs.needsD1Database ? 'Already exists' : false),
    task: async (ctx: InfrastructureContext) => {
      const result = await createD1Database(ctx.config.d1DatabaseName);
      if (result.success && result.id) {
        ctx.resources.d1Database.exists = true;
        ctx.resources.d1Database.id = result.id;
      }
    },
  });

  return tasks;
}
