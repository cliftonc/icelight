/**
 * Drizzle schema for analytics events stored in Basin Catalog
 *
 * This schema matches the FlattenedEvent structure from @icelight/core
 * as stored in the Iceberg table via Basin Pipelines.
 */

import { pgSchema, text, timestamp } from 'drizzle-orm/pg-core';

/**
 * Basin Catalog namespace the pipeline sink writes to
 */
export const analytics = pgSchema('analytics');

/**
 * Events table schema
 *
 * Queries reference the table as "analytics"."events" in Basin SQL.
 */
export const events = analytics.table('events', {
  // Pipeline-added timestamp
  __ingest_ts: timestamp('__ingest_ts', { mode: 'date' }),

  // Event identification
  messageId: text('message_id').notNull(),
  type: text('type').notNull(), // 'track' | 'identify' | 'page' | 'screen' | 'group' | 'alias'

  // User identification
  userId: text('user_id'),
  anonymousId: text('anonymous_id'),

  // Event data
  event: text('event'), // For track events
  name: text('name'), // For page/screen events

  // JSON fields (stored as JSON strings in Iceberg)
  properties: text('properties'), // JSON string
  traits: text('traits'), // JSON string
  context: text('context'), // JSON string

  // Timestamps (stored as microseconds in Iceberg)
  timestamp: timestamp('timestamp', { mode: 'date' }),
  sentAt: timestamp('sent_at', { mode: 'date' }),
  receivedAt: timestamp('received_at', { mode: 'date' }),
});

/**
 * Type inference for events table
 */
export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
