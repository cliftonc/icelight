#!/bin/bash

# Download pre-built DuckDB extensions for linux_amd64
# These are loaded at runtime instead of downloading during container startup

set -e

EXTENSIONS_DIR="$PWD/container/extensions"
DUCKDB_VERSION="1.4.3"

rm -rf "$EXTENSIONS_DIR"
mkdir -p "$EXTENSIONS_DIR"

echo "Downloading DuckDB extensions (v$DUCKDB_VERSION) for linux_amd64..."

# Download extensions
curl -s "http://extensions.duckdb.org/v$DUCKDB_VERSION/linux_amd64/httpfs.duckdb_extension.gz" --output "$EXTENSIONS_DIR/httpfs.duckdb_extension.gz"
curl -s "http://extensions.duckdb.org/v$DUCKDB_VERSION/linux_amd64/iceberg.duckdb_extension.gz" --output "$EXTENSIONS_DIR/iceberg.duckdb_extension.gz"
curl -s "http://extensions.duckdb.org/v$DUCKDB_VERSION/linux_amd64/avro.duckdb_extension.gz" --output "$EXTENSIONS_DIR/avro.duckdb_extension.gz"

# Unzip
gunzip "$EXTENSIONS_DIR/httpfs.duckdb_extension.gz"
gunzip "$EXTENSIONS_DIR/iceberg.duckdb_extension.gz"
gunzip "$EXTENSIONS_DIR/avro.duckdb_extension.gz"

echo "Extensions downloaded to $EXTENSIONS_DIR:"
ls -la "$EXTENSIONS_DIR"
