/**
 * Main Reseed App component
 * Same phase flow and components as teardown: prepare → confirm → run → summary
 */

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Box, Text, useApp } from 'ink';
import Spinner from 'ink-spinner';
import {
  Banner,
  warningGradient,
  Confirm,
  StepFlow,
  SummaryBox,
  KeyValueLine,
  SuccessLine,
  type FlowGroupDefinition,
  type FlowTaskDefinition,
} from '../shared/components/index.js';
import { ErrorDisplay } from '../teardown/components/ErrorDisplay.js';
import { formatCommandError } from '../setup/core/wrangler.js';
import { createSink, createPipeline } from '../setup/steps/infrastructure.js';
import { deletePipeline, deleteSink } from '../teardown/steps/pipeline.js';
import { dropCatalogTable, deleteObjectsWithPrefix } from '../teardown/steps/storage.js';
import { seedEvents } from '../shared/seed-events.js';
import {
  NAMESPACE,
  TABLE,
  prepareReseed,
  purgeQueryCache,
  waitForEvents,
  type ReseedOptions,
  type ReseedPlan,
} from './steps.js';

type ReseedPhase = 'preparing' | 'confirm' | 'running' | 'summary' | 'error';

const RESEED_GROUPS: FlowGroupDefinition[] = [
  { key: 'pipeline', title: 'Pipeline' },
  { key: 'data', title: 'Event Data' },
  { key: 'recreate', title: 'Recreate' },
  { key: 'seed', title: 'Demo Events' },
  { key: 'cache', title: 'Query Cache' },
];

/** Filled in by the tasks, shown in the summary */
interface ReseedResults {
  objectsDeleted: number;
  sent: number;
  total: number;
  users: number;
  failedBatches: number;
  landed: number | null;
  purged: number | null;
  dashboardReset: boolean;
}

interface ReseedAppProps {
  options: ReseedOptions;
}

export function ReseedApp({ options }: ReseedAppProps): React.ReactElement {
  const { exit } = useApp();
  const [phase, setPhase] = useState<ReseedPhase>('preparing');
  const [status, setStatus] = useState('Loading configuration...');
  const [plan, setPlan] = useState<ReseedPlan | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const resultsRef = useRef<ReseedResults>({
    objectsDeleted: 0,
    sent: 0,
    total: 0,
    users: 0,
    failedBatches: 0,
    landed: null,
    purged: null,
    dashboardReset: false,
  });

  const handleError = useCallback((err: Error) => {
    setError(err);
    setPhase('error');
  }, []);

  // Check auth, load config and look up resources
  useEffect(() => {
    prepareReseed(setStatus)
      .then((resolved) => {
        setPlan(resolved);
        setPhase(options.confirmed ? 'running' : 'confirm');
      })
      .catch((err) => handleError(err instanceof Error ? err : new Error(String(err))));
  }, [options.confirmed, handleError]);

  const handleConfirm = useCallback(
    (confirmed: boolean) => {
      if (confirmed) setPhase('running');
      else exit();
    },
    [exit]
  );

  const handleRunComplete = useCallback(
    (err?: Error) => {
      if (err) handleError(err);
      else setPhase('summary');
    },
    [handleError]
  );

  const tasks = useMemo(() => buildReseedTasks(options, resultsRef.current), [options]);

  return (
    <Box flexDirection="column">
      <Banner
        text="RESEED"
        font="Small"
        gradient={warningGradient}
        subtitle="icelight → Demo Data Reseed"
      />

      {phase === 'preparing' && (
        <Box>
          <Text color="cyan">
            <Spinner type="dots" />
          </Text>
          <Text> {status}</Text>
        </Box>
      )}

      {phase === 'confirm' && plan && <ReseedConfirm plan={plan} options={options} onConfirm={handleConfirm} />}

      {phase === 'running' && plan && (
        <StepFlow<ReseedPlan>
          groups={RESEED_GROUPS}
          tasks={tasks}
          context={plan}
          onComplete={handleRunComplete}
          exitOnError={true}
          showCompletedGroups={true}
        />
      )}

      {phase === 'summary' && plan && (
        <ReseedSummary plan={plan} options={options} results={resultsRef.current} onExit={exit} />
      )}

      {phase === 'error' && error && <ErrorDisplay error={error} title="Reseed Failed" onExit={exit} />}
    </Box>
  );
}

interface ReseedConfirmProps {
  plan: ReseedPlan;
  options: ReseedOptions;
  onConfirm: (confirmed: boolean) => void;
}

function ReseedConfirm({ plan, options, onConfirm }: ReseedConfirmProps): React.ReactElement {
  const { config } = plan;
  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text color="red" bold>
          Every event in {NAMESPACE}.{TABLE} will be deleted and replaced with demo data:
        </Text>
      </Box>
      <Box marginLeft={2} flexDirection="column" marginBottom={1}>
        <Text color="red">• {NAMESPACE}.{TABLE} in {config.bucketName} (ALL events!)</Text>
        <Text color="gray">• Recreates {config.pipelineName} and {config.sinkName}</Text>
        <Text color="green">• Keeps {config.streamName}, the bucket, catalog, workers, KV and D1</Text>
        <Text color="gray">• Seeds {options.days} days of demo events via {plan.ingestUrl}</Text>
        {options.resetDashboard && <Text color="gray">• Resets the default dashboard</Text>}
      </Box>
      {plan.streamMismatch && (
        <Box marginLeft={2} flexDirection="column" marginBottom={1}>
          <Text color="yellow">
            ⚠ The ingest worker is bound to stream {plan.streamMismatch}, not {config.streamName}.
          </Text>
          <Text color="yellow">  Run `pnpm launch` to fix the binding; seeded events may not arrive.</Text>
        </Box>
      )}
      <Confirm message="Delete all events and reseed?" defaultValue={false} onConfirm={onConfirm} />
    </Box>
  );
}

interface ReseedSummaryProps {
  plan: ReseedPlan;
  options: ReseedOptions;
  results: ReseedResults;
  onExit: () => void;
}

function ReseedSummary({ plan, options, results, onExit }: ReseedSummaryProps): React.ReactElement {
  // Auto-exit after showing summary
  useEffect(() => {
    const timer = setTimeout(onExit, 100);
    return () => clearTimeout(timer);
  }, [onExit]);

  const allLanded = results.landed !== null && results.landed >= results.sent;
  const complete = allLanded && results.failedBatches === 0;

  return (
    <SummaryBox title={complete ? 'Reseed Complete' : 'Reseed Finished With Warnings'} type={complete ? 'success' : 'warning'}>
      <KeyValueLine label="Table" value={`${NAMESPACE}.${TABLE} in ${plan.config.bucketName}`} />
      <KeyValueLine label="Days" value={String(options.days)} />
      <KeyValueLine
        label="Events sent"
        value={`${results.sent.toLocaleString()} of ${results.total.toLocaleString()} (${results.users.toLocaleString()} users)`}
        color={results.failedBatches > 0 ? 'yellow' : 'cyan'}
      />
      <KeyValueLine
        label="Events queryable"
        value={results.landed === null ? 'not yet' : results.landed.toLocaleString()}
        color={allLanded ? 'cyan' : 'yellow'}
      />
      <Box marginTop={1} flexDirection="column">
        <SuccessLine text={`Deleted ${results.objectsDeleted.toLocaleString()} data files`} />
        <SuccessLine text={`Recreated ${plan.config.sinkName} and ${plan.config.pipelineName}`} />
        {results.purged !== null && (
          <SuccessLine text={`Purged ${results.purged.toLocaleString()} cached query results`} />
        )}
        {results.dashboardReset && <SuccessLine text="Reset the default dashboard" />}
      </Box>
      {!allLanded && (
        <Box marginTop={1} flexDirection="column">
          <Text color="gray">Events appear in Basin SQL after the next sink roll (about 1-2 minutes).</Text>
          <Text color="gray">Shift+click a portlet's refresh button to bypass cached results until then.</Text>
        </Box>
      )}
    </SummaryBox>
  );
}

/**
 * Build the reseed task list. Order matters: the pipeline references the
 * sink, and a new sink can't write to an existing table.
 */
function buildReseedTasks(
  options: ReseedOptions,
  results: ReseedResults
): FlowTaskDefinition<ReseedPlan>[] {
  return [
    {
      key: 'delete-pipeline',
      title: 'Delete pipeline',
      group: 'pipeline',
      skip: (plan) => (!plan.pipelineId ? 'Not found' : false),
      task: async (plan) => {
        const result = await deletePipeline(plan.pipelineId!);
        if (!result.success) throw formatCommandError('Deleting the pipeline failed', result.error ?? '');
      },
    },
    {
      key: 'delete-sink',
      title: 'Delete sink',
      group: 'pipeline',
      skip: (plan) => (!plan.sinkId ? 'Not found' : false),
      task: async (plan) => {
        const result = await deleteSink(plan.sinkId!);
        if (!result.success) throw formatCommandError('Deleting the sink failed', result.error ?? '');
      },
    },
    {
      key: 'drop-table',
      title: `Drop ${NAMESPACE}.${TABLE} and its files`,
      group: 'data',
      task: async (plan, report) => {
        report('Dropping Basin Catalog table...');
        const drop = await dropCatalogTable(plan.config.bucketName, NAMESPACE, TABLE, plan.apiToken, plan.accountId);
        if (!drop.success) throw new Error(drop.error ?? 'Dropping the catalog table failed');
        if (!drop.keyPrefix) {
          report(drop.dropped ? 'Table dropped; location unknown, files left in R2' : 'Table not found');
          return;
        }
        const removed = await deleteObjectsWithPrefix(
          plan.config.bucketName,
          drop.keyPrefix,
          plan.apiToken,
          plan.accountId,
          (deleted, total) => report(`Deleting files: ${deleted.toLocaleString()} / ${total.toLocaleString()}`),
          report
        );
        results.objectsDeleted = removed.deletedCount;
        if (!removed.success) {
          report(`${removed.failedCount} files could not be deleted (no longer referenced)`);
        }
      },
    },
    {
      key: 'create-sink',
      title: 'Create sink',
      group: 'recreate',
      task: async (plan) => {
        const sink = await createSink(plan.config.sinkName, plan.config.bucketName, plan.apiToken);
        if (!sink.success) throw formatCommandError('Creating the sink failed', sink.output, [plan.apiToken]);
      },
    },
    {
      key: 'create-pipeline',
      title: 'Create pipeline',
      group: 'recreate',
      task: async (plan) => {
        const pipeline = await createPipeline(plan.config.pipelineName, plan.config.sinkName, plan.config.streamName);
        if (!pipeline.success) throw formatCommandError('Creating the pipeline failed', pipeline.output);
      },
    },
    {
      key: 'seed',
      title: `Send ${options.days} days of demo events`,
      group: 'seed',
      task: async (plan, report) => {
        report('Generating events...');
        const seeded = await seedEvents({
          ingestApiUrl: plan.ingestUrl,
          days: options.days,
          onProgress: ({ batch, totalBatches, sent, total }) =>
            report(`${sent.toLocaleString()} / ${total.toLocaleString()} events (batch ${batch}/${totalBatches})`),
        });
        results.sent = seeded.sent;
        results.total = seeded.total;
        results.users = seeded.userCount;
        results.failedBatches = seeded.errors;
        if (seeded.sent === 0) {
          throw new Error(`No events were accepted by ${plan.ingestUrl} (${seeded.errors} failed batches)`);
        }
      },
    },
    {
      key: 'wait',
      title: 'Wait for events to land',
      group: 'seed',
      task: async (plan, report) => {
        results.landed = await waitForEvents(plan, results.sent, report);
      },
    },
    {
      key: 'purge-cache',
      title: 'Purge cached query results',
      group: 'cache',
      skip: (plan) => (!plan.kvNamespaceId ? 'No CACHE KV namespace' : false),
      task: async (plan) => {
        results.purged = await purgeQueryCache(plan.kvNamespaceId!);
      },
    },
    {
      key: 'reset-dashboard',
      title: 'Reset the default dashboard',
      group: 'cache',
      skip: (plan) => {
        if (!options.resetDashboard) return 'Not requested (--reset-dashboard)';
        if (!plan.queryUrl) return 'Query API URL unknown';
        return false;
      },
      task: async (plan) => {
        const response = await fetch(`${plan.queryUrl}/api/dashboards/default/reset`, { method: 'POST' });
        if (!response.ok) throw new Error(`Dashboard reset failed: ${response.status} ${await response.text()}`);
        results.dashboardReset = true;
      },
    },
  ];
}
