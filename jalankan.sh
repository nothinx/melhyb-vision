#!/usr/bin/env bash
# Jalankan backend dan frontend untuk pengembangan lokal.
set -euo pipefail
cd "$(dirname "$0")"

python3 -m venv .venv 2>/dev/null || true
source .venv/bin/activate
pip install -q -r backend/requirements-dev.txt

( cd backend && uvicorn app.main:app --reload --port 8000 ) &
BACKEND=$!
trap 'kill $BACKEND 2>/dev/null || true' EXIT

cd frontend
[ -d node_modules ] || npm install
npm run dev
