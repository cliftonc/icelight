// Hono app factory
export { createIngestApp } from './handler.js';

// Types
export type { IngestEnv, IngestResponse, PipelineBinding } from './handler.js';

// Auth utilities
export { authMiddleware, extractToken } from './auth.js';
export type { AuthConfig } from './auth.js';

// Batch processing
export { processBatch, processSingleEvent, getEndpointType } from './batch.js';
export type { BatchResult, EndpointType } from './batch.js';

// Default export - ready-to-use Hono app
export { default } from './handler.js';
