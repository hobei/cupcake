#!/usr/bin/env bash
set -e

# Compile TypeScript (type-check server/db) and build the browser bundle.
npx tsc -p tsconfig.json --noEmit
npx tsc -p tsconfig.client.json

# Audit dependencies and fail the build on any high-severity vulnerability
# so that warnings are treated as errors in CI.
npm audit --audit-level=high
echo "Build passed."
