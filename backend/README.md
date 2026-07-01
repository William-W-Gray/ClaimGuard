# ClaimGuard 360° — Backend

> Every claim, verified. Every member, protected. Every provider, accountable.

Enterprise healthcare **fraud-prevention** backend for the ClaimGuard 360° platform.
Production-grade, modular-monolith architecture built with **FastAPI + PostgreSQL +
Redis + Celery**, exposing REST + WebSocket APIs for the React frontend.

---

## ✨ Highlights

- **Modular monolith** — vertical-slice domain modules, extractable into services later.
- **Clean architecture** — Routes → Services → Repositories → DB. No business logic in routes.
- **FraudShield engine** — explainable risk scoring (Rule Engine → ML adapter → SHAP explanation → Decision engine).
- **RBAC security** — JWT access/refresh with rotation, Argon2 hashing, role/permission guards.
- **Realtime** — WebSocket gateway with heartbeat/reconnect, replacing the frontend mock emitter.
- **Consistent API** — every response is `{success, message, data, metadata, errors}`.
- **Observability** — structured JSON logs, request/correlation IDs, Prometheus `/metrics`, liveness/readiness probes.
- **Runs fully offline** — Redis degrades to an in-memory shim; seeded Zimbabwe demo data.

---

## 🚀 Quick start (Docker)

```bash
cd backend
cp .env.example .env
docker compose up --build
```

Then:

- API + Swagger UI → http://localhost:8000/docs
- ReDoc → http://localhost:8000/redoc
- Health → http://localhost:8000/api/v1/health

Seed demo data (first run):

```bash
docker compose exec api python -m scripts.seed
# or set SEED_ON_STARTUP=true in .env
```

## 🧑‍💻 Local development (no Docker)

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env

# Bring up Postgres + Redis (or use the shim: unset REDIS_URL / point DB at SQLite)
alembic upgrade head
python -m scripts.seed --create-tables
uvicorn app.main:app --reload
```

Default admin (from `.env`): `admin@claimguard.co.zw` / `ChangeMe!2026`

## ✅ Tests

```bash
pytest                 # SQLite-backed, no external services required
pytest --cov=app       # with coverage
```

---

## 🗂 Project structure

```
backend/
├── app/
│   ├── main.py                 # App factory + lifecycle
│   ├── core/                   # config, database, redis, security, logging,
│   │                           # exceptions, middleware, websocket, dependencies, responses
│   ├── models/                 # SQLAlchemy 2.x ORM (UUID pk, timestamps, audit, soft delete)
│   ├── schemas/                # Pydantic v2 DTOs (camelCase frontend contract)
│   ├── repositories/           # Data-access layer (only place touching the DB)
│   ├── services/               # Application services (orchestration)
│   ├── modules/
│   │   ├── fraudshield/         # rule_engine · ml_engine · explanation_engine · decision_engine
│   │   └── trustscore/          # provider reputation scoring
│   ├── api/v1/                 # Routers (auth, claims, providers, trustscore, members,
│   │                           # dashboard, fraudshield, investigations, notifications, demo, health, ws)
│   └── workers/                # Celery app + tasks
├── migrations/                 # Alembic (async)
├── scripts/                    # seed data
├── tests/                      # pytest (auth, claims, fraudshield, health)
└── docker/                     # Dockerfile
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md), [`docs/API.md`](docs/API.md),
and [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for detail.

---

## 🔌 Frontend integration

Point the React app at the backend:

```
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_WS_URL=ws://localhost:8000/api/v1/ws
```

The JSON contract matches the existing `frontend/src/types/index.ts` (camelCase),
so `mockApi.ts` can be swapped for real `fetch` calls incrementally.
