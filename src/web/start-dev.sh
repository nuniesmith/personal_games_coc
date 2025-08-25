#!/bin/sh
set -e
cd "$(dirname "$0")"
if [ ! -d node_modules ] || [ ! -f node_modules/.package-lock-ready ]; then
  echo "[coc-web] Installing dependencies (dev)..."
  npm install --no-audit --no-fund
  mkdir -p node_modules && touch node_modules/.package-lock-ready
fi
export NODE_ENV=development
export VITE_API_URL=${VITE_API_URL:-http://localhost/api}
export VITE_SOCKET_URL=${VITE_SOCKET_URL:-http://localhost}
echo "[coc-web] Starting Vite dev server"
npx vite --host 0.0.0.0 --port 5173
