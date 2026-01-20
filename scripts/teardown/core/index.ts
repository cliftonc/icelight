/**
 * Core utilities re-exports for teardown
 */

// Teardown-specific types
export type {
  ResourceIds,
  TeardownOptions,
  DeletedResources,
  TeardownContext,
  WorkerNames,
  ContainerNames,
  LocalConfigPaths,
  Config,
  AuthInfo,
} from './types.js';

// Colors (from setup core)
export { colors, c, gradientColors, applyGradient } from '../../setup/core/colors.js';

// Environment utilities (from setup core)
export {
  envFilePath,
  loadEnvFile,
  saveToEnvFile,
  getSavedEnvVar,
} from '../../setup/core/env.js';

// Wrangler command utilities (from setup core)
export {
  getWorkersPath,
  runQuiet,
  runQuietAsync,
  runCommandAsync,
  runCommandWithOutputAsync,
} from '../../setup/core/wrangler.js';

// UI utilities (from setup core)
export {
  symbols,
  style,
  sectionBox,
  headerBox,
  successBox,
  blank,
  divider,
  log,
  logSuccess,
  logError,
  logWarning,
  logInfo,
  logStep,
  listItem,
  kvLine,
} from '../../setup/core/ui.js';

// Prompts (from setup core)
export { promptConfirm } from '../../setup/core/prompts.js';

// Auth check (from setup steps)
export { checkWranglerAuth } from '../../setup/steps/auth.js';

// Config derivation (from setup steps)
export { deriveConfig, getWorkerNames } from '../../setup/steps/config.js';
