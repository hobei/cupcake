#!/usr/bin/env bash
set -e

# Compile TypeScript (server/db → dist/, browser bundle → public/app.js).
npm run build

# Audit dependencies and fail the build on any high-severity vulnerability
# so that warnings are treated as errors in CI.
npm audit --audit-level=high
echo "Build passed."
