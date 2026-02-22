#!/usr/bin/env bash
set -e

# Usage:
#   bash run_local.sh           # in-memory storage (no persistence, default)
#   bash run_local.sh sqlite    # SQLite storage (persists to ./tasks.db)

if [ "${1}" = "sqlite" ]; then
  export DB_PATH="${DB_PATH:-./tasks.db}"
  echo "Using SQLite storage at: ${DB_PATH}"
fi

npm run dev
