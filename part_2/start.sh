#!/usr/bin/env bash
# Friendly wrapper: jump to this folder, maybe create .env, maybe npm install, then run the app.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

if [[ ! -f .env ]] && [[ -f .env.example ]]; then
  echo "No .env found; copying .env.example -> .env (edit .env for your environment)."
  cp .env.example .env
fi

if [[ ! -d node_modules ]]; then
  echo "Installing dependencies..."
  npm install
fi

exec npm run start
