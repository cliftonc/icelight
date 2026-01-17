# Querying Data

cdpflare stores events in Apache Iceberg tables that can be queried via multiple methods.

## Query API Worker

The simplest way to query data is via the included query worker.

### Execute SQL Query

```bash
curl -X POST https://cdpflare-query-api.your-subdomain.workers.dev/query \
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
    "executionTime": 150
  }
}
```

### List Tables

```bash
curl https://cdpflare-query-api.your-subdomain.workers.dev/tables/analytics
```

### Describe Table

```bash
curl https://cdpflare-query-api.your-subdomain.workers.dev/tables/analytics/events
```

## Wrangler CLI

Query directly via the Wrangler CLI:

```bash
npx wrangler r2 sql query "your-warehouse-name" \
  "SELECT type, COUNT(*) as count FROM analytics.events GROUP BY type"
```

## External Query Engines

### PyIceberg (Python)

```python
from pyiceberg.catalog import load_catalog

catalog = load_catalog(
    "cloudflare",
    **{
        "type": "rest",
        "uri": "https://your-warehouse.r2.cloudflarestorage.com",
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

# Connect to Iceberg catalog
conn = duckdb.connect()
conn.execute("""
    INSTALL iceberg;
    LOAD iceberg;
""")

# Query Iceberg table
df = conn.execute("""
    SELECT * FROM iceberg_scan(
        's3://your-bucket/analytics/events',
        allow_moved_paths = true
    )
    WHERE type = 'track'
    LIMIT 100
""").fetchdf()
```

### Apache Spark

```python
from pyspark.sql import SparkSession

spark = SparkSession.builder \
    .appName("cdpflare-query") \
    .config("spark.sql.catalog.cloudflare", "org.apache.iceberg.spark.SparkCatalog") \
    .config("spark.sql.catalog.cloudflare.type", "rest") \
    .config("spark.sql.catalog.cloudflare.uri", "https://your-warehouse.r2.cloudflarestorage.com") \
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
  DATE(timestamp) as date,
  COUNT(DISTINCT COALESCE(user_id, anonymous_id)) as dau
FROM analytics.events
GROUP BY DATE(timestamp)
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
  DATE(timestamp) as date,
  SUM(CAST(JSON_EXTRACT(properties, '$.revenue') AS DECIMAL)) as revenue
FROM analytics.events
WHERE type = 'track' AND event = 'Purchase Completed'
GROUP BY DATE(timestamp)
ORDER BY date DESC
```

## Limitations

### R2 SQL (Current Beta)

- **Read-only**: Only SELECT queries supported
- **No joins**: Cannot join tables (coming H1 2026)
- **No aggregations**: GROUP BY, COUNT, SUM not yet supported (coming H1 2026)
- **Limited functions**: Basic SQL functions only

For complex queries, export data to PyIceberg, DuckDB, or Spark.

### Data Latency

- Events are batched and written to Parquet files based on `ROLL_INTERVAL` (default: 60 seconds)
- There may be a 1-2 minute delay between ingestion and query availability
- R2 Data Catalog compaction runs automatically (2GB/hour during beta)
