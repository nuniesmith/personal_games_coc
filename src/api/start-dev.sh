#!/bin/sh
set -e
cd "$(dirname "$0")"
# If running from bind mount, ensure dependencies installed (idempotent)
if [ ! -d node_modules ] || [ ! -f node_modules/.package-lock-ready ]; then
  echo "[coc-api] Installing dependencies (dev)..."
  npm install --no-audit --no-fund
  # marker file so subsequent container restarts skip full reinstall unless node_modules deleted
  mkdir -p node_modules && touch node_modules/.package-lock-ready
fi
export NODE_ENV=development
echo "[coc-api] Starting nodemon (hot reload)"
npx nodemon server.js
