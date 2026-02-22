#!/usr/bin/env bash
set -e

# No compilation step required — the app runs directly from source.
# Audit dependencies and fail the build on any high-severity vulnerability
# so that warnings are treated as errors in CI.
npm audit --audit-level=high
echo "Build passed."
