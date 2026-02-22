#!/usr/bin/env bash
set -e

# DB_PATH controls the SQLite database file (defaults to ./database/tasks.db).
# Override by setting DB_PATH before calling this script, e.g.:
#   DB_PATH=/path/to/myapp.db bash utils/run_local.sh
export DB_PATH="${DB_PATH:-./database/tasks.db}"
echo "Using SQLite database: ${DB_PATH}"

npm run dev
