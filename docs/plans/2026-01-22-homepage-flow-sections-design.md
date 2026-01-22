# Homepage Flow Sections Design

## Overview

Redesign the query-api home page to expand the "How It Works" architecture diagram into detailed, navigable sections that explain each component of the data pipeline.

## Changes

### 1. Rename Section
- "SDK Integration" → "Client SDK Integration"

### 2. Make Architecture Boxes Clickable
- Each box in the "How It Works" diagram becomes an anchor link
- Clicking scrolls smoothly to the corresponding detailed section
- Add hover state to indicate interactivity

### 3. Add 6 Detailed Sections

Sections alternate left/right alignment with curved SVG connectors between them.

| # | Section | Alignment | Screenshot |
|---|---------|-----------|------------|
| 1 | Client SDK Integration | Left | No (code examples) |
| 2 | Ingest Worker | Right | event_simulator_*.png |
| 3 | Pipelines | Left | No (config snippet) |
| 4 | R2 + Iceberg | Right | No (conceptual) |
| 5 | DuckDB | Left | duckdb_query_*.png |
| 6 | Drizzle-Cube | Right | analysis_*.png |

### 4. Section Content (Medium Detail)

**1. Client SDK Integration**
- Brief intro about Analytics.js compatibility
- Tabs: RudderStack/Segment | Direct HTTP
- Code examples (existing)
- Links: RudderStack docs, Segment docs

**2. Ingest Worker**
- Description: Cloudflare Worker that receives, validates, forwards events
- Key features: RudderStack-compatible endpoints, batch support, CORS
- Config snippet: wrangler.jsonc pipeline binding
- Endpoints list: /v1/track, /v1/identify, /v1/page, /v1/batch
- Link: Cloudflare Workers docs
- Screenshot: Event Simulator page

**3. Pipelines**
- Description: Cloudflare streaming pipeline for batching and delivery
- How it works: JSON events → batches → R2 Iceberg format
- Config snippet: schema.events.json structure
- Beta badge
- Link: Cloudflare Pipelines docs

**4. R2 + Iceberg**
- Description: Object storage with Apache Iceberg table format
- Benefits: columnar storage, schema evolution, time travel
- Data catalog mention
- Links: R2 Data Catalog docs, Apache Iceberg docs

**5. DuckDB**
- Description: In-process analytics DB in Cloudflare Container
- Capabilities: full SQL, joins, aggregations
- CTA: Link to DuckDB query page
- Link: DuckDB docs
- Screenshot: DuckDB query page with results

**6. Drizzle-Cube**
- Description: Semantic layer for business questions → SQL
- Features: measures, dimensions, pre-aggregations, security
- CTAs: Try Analysis, View Dashboard
- Link: try.drizzle-cube.dev
- Screenshot: Analysis page

### 5. Curved Flow Connector

SVG component connecting sections visually:
- Full-width, ~120px height
- Bezier curve path with gradient stroke
- Colors: #6366f1 → #818cf8 → #a5b4fc
- Small accent dots (4-6px) along the path
- Two variants: left-to-right, right-to-left
- Mobile: simplifies to vertical line with dots

## Screenshots Required

User will provide (light/dark variants):
- `event_simulator_light.png` / `event_simulator_dark.png`
- `duckdb_query_light.png` / `duckdb_query_dark.png`
- `analysis_light.png` / `analysis_dark.png`

## Implementation Notes

- Add `id` attributes to sections for anchor navigation
- Use `scroll-behavior: smooth` or `scrollIntoView({ behavior: 'smooth' })`
- Reuse existing `CodeBlock` component
- Create new `FlowConnector` and `DetailSection` components
- Theme-aware screenshots using existing `useTheme` hook
