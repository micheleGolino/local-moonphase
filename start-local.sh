#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

echo "Starting Local Moonphase on http://localhost:5173"
npm run dev -- --host --open
