#!/bin/bash
set -e

# Ensure the projects volume exists (Railway mounts it at $DATA_DIR, e.g. /app/data).
if [ -n "$DATA_DIR" ]; then
  mkdir -p "$DATA_DIR"
  echo "[data] Using project store at $DATA_DIR"
fi

echo "[app] Starting Promo Builder (Next.js) on port ${PORT:-3000}..."
exec npm start
