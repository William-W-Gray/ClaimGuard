#!/usr/bin/env bash
# ─── ClaimGuard 360° — API container entrypoint ────────────────────────────────
set -euo pipefail

echo "[entrypoint] Running database migrations..."
alembic upgrade head

if [ "${SEED_ON_STARTUP:-false}" = "true" ]; then
  echo "[entrypoint] Seeding demo data..."
  python -m scripts.seed
fi

echo "[entrypoint] Starting API server..."
exec uvicorn app.main:app --host "${HOST:-0.0.0.0}" --port "${PORT:-8000}" --proxy-headers
