// Event types
export type {
  EventType,
  EventContext,
  PageContext,
  LibraryContext,
  BaseEvent,
  TrackEvent,
  IdentifyEvent,
  PageEvent,
  ScreenEvent,
  GroupEvent,
  AliasEvent,
  AnalyticsEvent,
  AnalyticsBatch,
  FlattenedEvent,
} from './event-schema.js';

// Validation utilities
export {
  validateEvent,
  validateBatch,
  generateMessageId,
  toSnakeCase,
  flattenEvent,
  flattenBatch,
} from './validation.js';
export type { ValidationResult } from './validation.js';

// Configuration types
export type {
  IngestConfig,
  QueryConfig,
  PipelineConfig,
} from './config.js';
export {
  DEFAULT_INGEST_CONFIG,
  DEFAULT_PIPELINE_CONFIG,
} from './config.js';
