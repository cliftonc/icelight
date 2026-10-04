# Querying Data

icelight stores events in Apache Iceberg tables managed by [Basin Catalog](https://developers.cloudflare.com/basin-catalog/). The query worker runs everything on [Basin SQL](https://developers.cloudflare.com/basin-sql/), Cloudflare's serverless query engine, and external engines can read the same tables.

## Query API Worker

The simplest way to query data is via the included query worker. `POST /query` proxies to the Basin SQL API (`POST https://api.sql.cloudflarestorage.com/api/v1/accounts/<account-id>/basin-sql/query/<bucket>`, body `{ warehouse, query }`).

### Execute SQL Query

```bash
curl -X POST https://icelight-query-api.your-subdomain.workers.dev/query \
  -H "Content-Type: application/json" \
  -d '{
    "sql": "SELECT * FROM analytics.events WHERE type = '\''track'\'' LIMIT 100",
    "format": "json"
  }'
```

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sql` | string | Yes | SQL query to execute |
| `format` | string | No | Output format: `json` (default) or `csv` |

**Response (JSON):**

```json
{
  "success": true,
  "data": [
    {
      "message_id": "abc123",
      "type": "track",
      "user_id": "user-123",
      "event": "Purchase Completed",
      "properties": {"revenue": 99.99},
      "timestamp": "2024-01-15T10:30:00Z"
    }
  ],
  "meta": {
    "columns": [
      {"name": "message_id", "type": "string"},
      {"name": "type", "type": "string"}
    ],
    "rowCount": 1,
    "executionTime": 150,
    "metrics": {"bytesScanned": 1048576, "filesScanned": 3}
  }
}
```

Basin SQL bills by compressed bytes scanned, so `meta.metrics.bytesScanned` shows what each query cost. Non-aggregated queries must include a `LIMIT` (max 10,000).

### List Tables

```bash
curl https://icelight-query-api.your-subdomain.workers.dev/tables/analytics
```

### Describe Table

```bash
curl https://icelight-query-api.your-subdomain.workers.dev/tables/analytics/events
```

## Drizzle Cube Semantic API

The query worker includes a semantic layer powered by [Drizzle Cube](https://try.drizzle-cube.dev) that provides a structured query API with automatic JSON field extraction.

Drizzle Cube compiles queries with its Postgres adapter and runs them on Basin SQL through a small drizzle `pg-proxy` driver (`workers/query-api/src/query/basin-drizzle.ts`). The driver inlines parameters as escaped literals (Basin SQL has no bound parameters) and emulates `OFFSET`, which Basin SQL does not support. JSON dimensions compile to Basin SQL's `json_get_str` / `json_get_float` / `json_get_bool` functions.

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/cubejs-api/v1/meta` | Get available cubes, dimensions, and measures |
| POST | `/cubejs-api/v1/load` | Execute a semantic query |
| POST | `/cubejs-api/v1/dry-run` | Validate query and preview SQL |

### Example Query

```bash
curl -X POST https://icelight-query-api.your-subdomain.workers.dev/cubejs-api/v1/load \
  -H "Content-Type: application/json" \
  -d '{
    "query": {
      "dimensions": ["Events.type", "Events.product", "Events.email"],
      "measures": ["Events.count", "Events.totalRevenue"],
      "filters": [
        {"dimension": "Events.type", "operator": "equals", "values": ["track"]}
      ],
      "limit": 100
    }
  }'
```

### Configuring JSON Field Extraction

The semantic API automatically extracts fields from the `properties`, `traits`, and `context` JSON columns. Each deployment can customize which fields are exposed as dimensions.

#### Configuration File

Edit `workers/query-api/src/cube-config.ts` to customize JSON field extraction:

```typescript
import { type CubeJsonConfig, mergeCubeConfig } from './query/index.js';

// Merge custom fields with defaults
export const cubeConfig: CubeJsonConfig = mergeCubeConfig({
  // Add custom properties fields
  properties: [
    { name: 'customField', title: 'Custom Field', path: '$.custom_field', type: 'string' },
    { name: 'score', title: 'Score', path: '$.score', type: 'number' },
  ],

  // Add custom traits fields
  traits: [
    { name: 'department', title: 'Department', path: '$.department', type: 'string' },
  ],

  // Add custom context fields
  context: [
    { name: 'region', title: 'Region', path: '$.geo.region', type: 'string' },
  ],
});
```

#### Field Configuration Options

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | string | Yes | Dimension name (camelCase, used in queries) |
| `title` | string | No | Human-readable title for UI |
| `path` | string | Yes | JSONPath to extract (e.g., `$.field`, `$.nested.field`, `$.items[0].sku`) |
| `type` | string | Yes | Data type: `string`, `number`, or `boolean` |
| `shown` | boolean | No | Whether to show in UI (default: true) |

#### Using Defaults Only

To use only the built-in defaults without customization:

```typescript
import { DEFAULT_CUBE_CONFIG } from './query/index.js';
export const cubeConfig = DEFAULT_CUBE_CONFIG;
```

#### Replacing Defaults Entirely

To completely replace the default configuration:

```typescript
import { createCubeConfig } from './query/index.js';

export const cubeConfig = createCubeConfig({
  properties: [
    { name: 'myField', title: 'My Field', path: '$.my_field', type: 'string' },
  ],
  traits: [],
  context: [],
});
```

### Default Dimensions

The following JSON fields are extracted by default:

**Properties (from track/page/screen events):**
- `orderId`, `revenue`, `currency`, `product`, `quantity`
- `url`, `title`, `referrer` (page events)
- `batchId`, `sequence` (batch events)
- `screenName`, `appVersion`, `platform`, `deviceType` (screen events)

**Traits (from identify/group events):**
- `email`, `traitName`, `plan`, `createdAt`
- `industry`, `employees` (group events)

**Context (environment data):**
- `ipAddress`, `userAgent`, `locale`, `timezone`
- `ctxDeviceType`, `ctxDeviceId`, `deviceManufacturer`, `deviceModel`
- `osName`, `osVersion`
- `pageUrl`, `pagePath`, `pageTitle`, `pageReferrer`
- `campaignSource`, `campaignMedium`, `campaignName`, `campaignTerm`, `campaignContent`
- `libraryName`, `libraryVersion`
- `screenWidth`, `screenHeight`, `screenDensity`

### Default Measures

| Measure | Description |
|---------|-------------|
| `Events.count` | Total event count |
| `Events.uniqueUsers` | Count of distinct user IDs |
| `Events.uniqueAnonymous` | Count of distinct anonymous IDs |
| `Events.totalRevenue` | Sum of revenue (when revenue field exists) |
| `Events.avgRevenue` | Average revenue (when revenue field exists) |

## Wrangler CLI

Query directly via the Wrangler CLI (needs `WRANGLER_BASIN_SQL_AUTH_TOKEN` or `CLOUDFLARE_API_TOKEN` set to a token with Basin SQL Read):

```bash
# Find your warehouse name (<account-id>_<bucket>)
npx wrangler basin catalog get icelight-data

npx wrangler basin sql query "<account-id>_icelight-data" \
  "SELECT type, COUNT(*) as count FROM analytics.events GROUP BY type"
```

## External Query Engines

Basin Catalog exposes a standard Iceberg REST catalog, so any Iceberg engine can read the tables directly. You need:

- **Catalog URI**: `https://catalog.cloudflarestorage.com/<account-id>/<bucket>` (shown by `wrangler basin catalog get <bucket>`)
- **Warehouse**: `<account-id>_<bucket>`
- **Token**: a Cloudflare API token with Basin Catalog and R2 Storage permissions

### PyIceberg (Python)

```python
from pyiceberg.catalog import load_catalog

catalog = load_catalog(
    "cloudflare",
    **{
        "type": "rest",
        "uri": "https://catalog.cloudflarestorage.com/<account-id>/icelight-data",
        "warehouse": "<account-id>_icelight-data",
        "token": "your-cloudflare-api-token"
    }
)

# Load table
table = catalog.load_table("analytics.events")

# Query with filters
df = table.scan(
    row_filter="type = 'track' AND timestamp > '2024-01-01'"
).to_pandas()

print(df.head())
```

### DuckDB

```python
import duckdb

# Attach the Basin Catalog via its Iceberg REST endpoint
conn = duckdb.connect()
conn.execute("""
    INSTALL iceberg;
    LOAD iceberg;

    CREATE SECRET basin_catalog (
        TYPE ICEBERG,
        TOKEN 'your-cloudflare-api-token'
    );

    ATTACH '<account-id>_icelight-data' AS basin (
        TYPE ICEBERG,
        ENDPOINT 'https://catalog.cloudflarestorage.com/<account-id>/icelight-data'
    );
""")

df = conn.execute("""
    SELECT * FROM basin.analytics.events
    WHERE type = 'track'
    LIMIT 100
""").fetchdf()
```

### Apache Spark

```python
from pyspark.sql import SparkSession

spark = SparkSession.builder \
    .appName("icelight-query") \
    .config("spark.sql.catalog.cloudflare", "org.apache.iceberg.spark.SparkCatalog") \
    .config("spark.sql.catalog.cloudflare.type", "rest") \
    .config("spark.sql.catalog.cloudflare.uri", "https://catalog.cloudflarestorage.com/<account-id>/icelight-data") \
    .config("spark.sql.catalog.cloudflare.warehouse", "<account-id>_icelight-data") \
    .config("spark.sql.catalog.cloudflare.token", "your-token") \
    .getOrCreate()

df = spark.sql("""
    SELECT user_id, event, properties, timestamp
    FROM cloudflare.analytics.events
    WHERE type = 'track'
    ORDER BY timestamp DESC
    LIMIT 1000
""")

df.show()
```

## Event Schema

The events table has the following columns:

| Column | Type | Description |
|--------|------|-------------|
| `message_id` | string | Unique event identifier |
| `type` | string | Event type (track, identify, page, etc.) |
| `user_id` | string | User identifier (nullable) |
| `anonymous_id` | string | Anonymous identifier (nullable) |
| `event` | string | Event name (for track events) |
| `name` | string | Page/screen name |
| `properties` | json | Event properties |
| `traits` | json | User/group traits |
| `context` | json | Event context |
| `timestamp` | timestamp | When event occurred |
| `sent_at` | timestamp | When SDK sent event |
| `received_at` | timestamp | When server received event |

## Example Queries

These run on Basin SQL (via `/query`, the UI's SQL page, or `wrangler basin sql query`).

### Event Counts by Type

```sql
SELECT type, COUNT(*) as count
FROM analytics.events
GROUP BY type
ORDER BY count DESC
```

### Daily Active Users

```sql
SELECT
  date_trunc('day', timestamp) as date,
  COUNT(DISTINCT COALESCE(user_id, anonymous_id)) as dau
FROM analytics.events
GROUP BY date_trunc('day', timestamp)
ORDER BY date DESC
LIMIT 30
```

### Top Events

```sql
SELECT event, COUNT(*) as count
FROM analytics.events
WHERE type = 'track'
GROUP BY event
ORDER BY count DESC
LIMIT 20
```

### User Journey

```sql
SELECT timestamp, type, event, name, properties
FROM analytics.events
WHERE user_id = 'user-123'
ORDER BY timestamp
LIMIT 100
```

### Revenue by Day

```sql
SELECT
  date_trunc('day', timestamp) as date,
  SUM(json_get_float(properties, 'revenue')) as revenue
FROM analytics.events
WHERE type = 'track' AND event = 'Purchase Completed'
GROUP BY date_trunc('day', timestamp)
ORDER BY date DESC
LIMIT 30
```

## Limitations

### Basin SQL

Basin SQL (formerly R2 SQL) has been generally available since October 2026. It supports aggregations, `GROUP BY`/`HAVING`, all join types, CTEs, subqueries, window functions, set operations and JSON functions. Remaining gaps:

- **Read-only**: only `SELECT` (plus `SHOW`/`DESCRIBE`/`EXPLAIN`); no writes or DDL
- **No `OFFSET`**, `UNNEST`, `PIVOT`/`UNPIVOT` or `LATERAL` (the semantic layer emulates `OFFSET`)
- **Default `LIMIT 500`** when a query has no `LIMIT`
- Very heavy queries (large `COUNT(DISTINCT)`, multi-way joins, percentiles) may time out or be rejected
- **Pricing**: $2.50/TB of compressed data scanned after 10 GB/month free, 10 MB minimum per query ([pricing](https://developers.cloudflare.com/basin/platform/pricing/))

See the [Basin SQL limitations](https://developers.cloudflare.com/basin-sql/reference/limitations-best-practices/) page for details.

### Data Latency

- The sink rolls new Parquet files every 60 seconds (the minimum for Basin Catalog sinks)
- There may be a 1-2 minute delay between ingestion and query availability
- Enable Basin Catalog compaction (`wrangler basin catalog compaction enable`) to merge small files on long-running deployments
