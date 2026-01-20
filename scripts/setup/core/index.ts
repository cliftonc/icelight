/**
 * Core utilities re-exports
 */

// Colors (centralized brand palette)
export { colors, c, gradientColors, applyGradient } from './colors.js';

// Types
export type {
  Config,
  AuthInfo,
  ExistingResources,
  DeployedUrls,
  SecretStatus,
  CommandResult,
  WorkerStatus,
  SetupContext,
  SavedEnv,
  LocalConfigOptions,
} from './types.js';

// Environment utilities
export {
  envFilePath,
  loadEnvFile,
  saveToEnvFile,
  getSavedEnvVar,
} from './env.js';

// Wrangler command utilities
export {
  getTemplatesPath,
  getWorkersPath,
  getScriptsPath,
  runQuiet, // Only sync function kept - used in auth.ts before listr2 starts
  runQuietAsync,
  runCommandAsync,
  runCommandWithOutputAsync,
  extractWorkerUrl,
  setSecretAsync,
  checkWorkerDeployedAsync,
  fetchSubdomainFromApi,
  setCachedSubdomain,
  getCachedSubdomain,
  constructWorkerUrl,
  extractSubdomainFromUrl,
  getSchemaPath,
  parseJsonc,
  readWranglerConfig,
  writeWranglerLocalConfig,
} from './wrangler.js';

// UI utilities
export {
  symbols,
  style,
  sectionBox,
  headerBox,
  successBox,
  resourceLine,
  configLine,
  kvLine,
  listItem,
  stepLine,
  blank,
  divider,
  log,
  logSuccess,
  logError,
  logWarning,
  logInfo,
  logStep,
} from './ui.js';

// Prompt utilities
export {
  promptProjectName,
  promptApiToken,
  promptRedeploy,
  promptConfirm,
  promptInput,
} from './prompts.js';
