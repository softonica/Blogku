#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT/frontend"
# Release build: pocketbase source + same-origin base URL.
VITE_USE_POCKETBASE=true VITE_PB_URL= npx vite build
rm -rf "$ROOT/backend/dist"
mkdir -p "$ROOT/backend/dist"
cp -r dist/. "$ROOT/backend/dist/"
cd "$ROOT/backend"
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -ldflags="-s -w" -o blogku .
echo "Built: $ROOT/backend/blogku"
