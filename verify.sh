#!/usr/bin/env bash
set -e

echo "=== claude-operator verify ==="

echo ">> pnpm build"
pnpm build

echo ">> pnpm test (all packages)"
pnpm test

echo ">> verify.sh PASSED"
