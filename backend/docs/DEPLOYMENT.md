# ClaimGuard 360° — Deployment Guide

## Topology

```
        ┌──────────┐   ┌──────────┐   ┌──────────┐
        │   api    │   │  worker  │   │   beat   │   (all from one image)
        │ uvicorn  │   │  celery  │   │  celery  │
        └────┬─────┘   └────┬─────┘   └────┬─────┘
             └──────┬───────┴──────┬───────┘
              ┌─────▼─────┐  ┌─────▼─────┐
              │ postgres  │  │   redis   │
              └───────────┘  └───────────┘
```

## 1. Docker Compose (dev / demo)

```bash
cp .env.example .env
docker compose up --build          # api:8000, worker, beat, db, redis
docker compose exec api python -m scripts.seed
```

Services: `api`, `worker` (Celery), `beat` (scheduler), `db` (Postgres 16), `redis`.
The API entrypoint runs `alembic upgrade head` automatically.

## 2. Configuration (12-factor)

All config comes from environment variables (see `.env.example`). For production:

- `ENVIRONMENT=production`, `DEBUG=false`, `LOG_JSON=true`
- `JWT_SECRET_KEY` → `openssl rand -hex 32` (store in a secrets manager)
- `CORS_ORIGINS` → explicit frontend origins (no `*`)
- `DATABASE_URL` → managed Postgres (asyncpg driver)
- `REDIS_URL`, `CELERY_BROKER_URL`, `CELERY_RESULT_BACKEND` → managed Redis

## 3. Migrations

```bash
alembic revision --autogenerate -m "message"   # create
alembic upgrade head                            # apply
alembic downgrade -1                            # rollback one
```

## 4. Health & probes (Kubernetes)

```yaml
livenessProbe:
  httpGet: { path: /api/v1/health/liveness, port: 8000 }
readinessProbe:
  httpGet: { path: /api/v1/health/readiness, port: 8000 }
```

`/api/v1/health/metrics` exposes Prometheus metrics.

## 5. Production run

Container `CMD` runs uvicorn; scale horizontally behind a load balancer. For
multi-worker CPU scaling use a process manager (e.g. `gunicorn -k uvicorn.workers.UvicornWorker`).

> Note: the in-process WebSocket manager is per-instance. For multi-instance
> realtime, back `publish()` with a Redis pub/sub fan-out (interface already isolated).

## 6. Hardening checklist

- [ ] Rotate `JWT_SECRET_KEY`; short access TTL, rotating refresh tokens (built-in)
- [ ] TLS terminated at the edge; HSTS enabled in production (built-in)
- [ ] Rate limits tuned (`RATE_LIMIT_PER_MINUTE`)
- [ ] DB least-privilege user; automated backups; PITR
- [ ] Centralised JSON logs + Prometheus/Grafana + alerts
- [ ] Run containers as non-root (built-in) with read-only FS where possible
