#!/usr/bin/env bash
# ─── ClaimGuard 360° — API container entrypoint ────────────────────────────────
set -euo pipefail

echo "[entrypoint] Running database migrations..."
alembic upgrade head

if [ "${SEED_ON_STARTUP:-false}" = "true" ]; then
  echo "[entrypoint] Seeding demo data..."
  python -m scripts.seed
fi

echo "[entrypoint] Starting API server (${WEB_CONCURRENCY:-2} workers)..."
# gunicorn as the process manager (graceful restarts, worker recycling) with
# uvicorn workers for ASGI/WebSocket. Realtime fan-out is Redis-backed, so >1
# worker is safe. Tune worker count with WEB_CONCURRENCY.
exec gunicorn app.main:app \
  --worker-class uvicorn.workers.UvicornWorker \
  --workers "${WEB_CONCURRENCY:-2}" \
  --bind "${HOST:-0.0.0.0}:${PORT:-8000}" \
  --timeout "${GUNICORN_TIMEOUT:-60}" \
  --graceful-timeout 30 \
  --max-requests "${GUNICORN_MAX_REQUESTS:-1000}" \
  --max-requests-jitter 100 \
  --forwarded-allow-ips "*" \
  --access-logfile - \
  --error-logfile -
