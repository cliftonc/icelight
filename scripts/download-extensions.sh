#!/bin/bash

# Download pre-built DuckDB extensions for linux_amd64
# These are loaded at runtime instead of downloading during container startup

set -e

EXTENSIONS_DIR="$PWD/container/extensions"
DUCKDB_VERSION="1.4.3"

rm -rf "$EXTENSIONS_DIR"
mkdir -p "$EXTENSIONS_DIR"

# Download extensions (silent to avoid interfering with listr2 output)
curl -s "http://extensions.duckdb.org/v$DUCKDB_VERSION/linux_amd64/httpfs.duckdb_extension.gz" --output "$EXTENSIONS_DIR/httpfs.duckdb_extension.gz"
curl -s "http://extensions.duckdb.org/v$DUCKDB_VERSION/linux_amd64/iceberg.duckdb_extension.gz" --output "$EXTENSIONS_DIR/iceberg.duckdb_extension.gz"
curl -s "http://extensions.duckdb.org/v$DUCKDB_VERSION/linux_amd64/avro.duckdb_extension.gz" --output "$EXTENSIONS_DIR/avro.duckdb_extension.gz"

# Unzip (quiet mode)
gunzip -q "$EXTENSIONS_DIR/httpfs.duckdb_extension.gz"
gunzip -q "$EXTENSIONS_DIR/iceberg.duckdb_extension.gz"
gunzip -q "$EXTENSIONS_DIR/avro.duckdb_extension.gz"
