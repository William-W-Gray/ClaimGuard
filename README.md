# ClaimGuard 360°

> **Every claim, verified. Every member, protected. Every provider, accountable.**

An enterprise healthcare **fraud-prevention platform** for medical-aid claims
(built around the Zimbabwe / Cimas + NH263 context). It scores every claim in
real time with an explainable engine, engages members over WhatsApp/USSD to
confirm or dispute suspicious activity, tracks provider reputation, and gives
investigators a full case-management workflow.

```
┌────────────┐    /api  +  /ws   ┌────────────┐
│  Web (SPA) │ ────────────────▶ │  API       │──▶ PostgreSQL
│  nginx     │   reverse proxy   │  FastAPI   │──▶ Redis
└────────────┘                   └────────────┘      ▲
   React 19                        Celery worker + beat ┘
```

---

## 🚀 Quick start (one command)

Requires Docker + Docker Compose.

```bash
cp .env.example .env        # set DATABASE_URL to your managed Postgres (see below)
docker compose up --build
```

Then open:

| What | URL |
|------|-----|
| **Web app** | http://localhost:8080 |
| API docs (Swagger) | http://localhost:8000/docs |
| API health | http://localhost:8000/api/v1/health |

**Demo login** (pre-filled on the sign-in screen):

```
admin@claimguard.co.zw  /  ChangeMe!2026
```

The API container automatically runs database migrations and seeds realistic
demo data (members, providers, claims, a fraud-investigation team, and
notifications) on first boot. The web container serves the built SPA and
reverse-proxies `/api` **and the WebSocket** to the backend, so everything is
same-origin — no CORS to configure.

To stop:

```bash
docker compose down            # stop (managed DB data is untouched)
```

The seeded demo team includes: `admin` (super user) plus an analyst and two
agents (all use the same demo password) so you can exercise **case assignment**.

### Database options

The stack uses **managed Postgres by default** — set `DATABASE_URL` in `.env`
(use the provider's **direct**, non-pooled endpoint with the asyncpg driver + SSL):

```
# Neon example
DATABASE_URL=postgresql+asyncpg://USER:PASSWORD@ep-xxxx.REGION.aws.neon.tech/DBNAME?ssl=require
```

Prefer to run everything locally instead? Leave `DATABASE_URL` blank and start the
bundled Postgres container via its profile:

```bash
docker compose --profile local-db up --build   # local Postgres in a container
docker compose --profile local-db down -v      # stop + wipe the local DB volume
```

Either way, the API container runs Alembic migrations and seeds demo data on boot.

---

## ✨ Features

- **FraudShield** — explainable claim risk scoring: rule engine → ML ensemble →
  exact SHAP feature contributions → decision engine (approve / verify / investigate).
  The ML backend is a **trained XGBoost + IsolationForest ensemble** (TreeSHAP
  explanations) trained on *synthetic* claims data via `scripts/train_fraud_model.py`
  — ROC-AUC ≈ 0.99, precision ≈ 0.85, recall ≈ 0.90 at its operating point. It's
  selected by `ML_ENGINE=auto` and falls back to a dependency-free logistic
  heuristic if the model artifacts are absent. To train on real claims, see
  [backend/docs/FRAUDSHIELD_PRODUCTION_DATA.md](backend/docs/FRAUDSHIELD_PRODUCTION_DATA.md).
- **Real-time** — live claim-scoring feed, member responses, TrustScore changes and
  notifications pushed over a WebSocket gateway.
- **MemberGuard** — member benefit tracking + WhatsApp/USSD confirm-or-dispute flow.
- **TrustScore** — provider reputation scoring, badges and trend analysis.
- **Investigations** — case queue with status filter, **"My cases"**, assignment to
  specific users, comments, and resolution tracking. Assignees get notified.
- **Auth & RBAC** — JWT access/refresh (rotating), Argon2 hashing, role-gated actions
  (agent / analyst / auditor / admin).
- **Persistent notifications** — generated server-side at the domain source; the bell
  updates live and survives refresh.
- **Production hardening** — consistent response envelope, structured JSON logs with
  request/correlation IDs, rate limiting, security headers, audit log, health probes,
  Prometheus metrics.

---

## 🧑‍💻 Local development (without Docker)

Run the backend and frontend separately with hot-reload.

**Backend** (Python 3.12):

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env
# quick start on SQLite (no Postgres needed):
DATABASE_URL="sqlite+aiosqlite:///./dev.db" alembic upgrade head
DATABASE_URL="sqlite+aiosqlite:///./dev.db" python -m scripts.seed
DATABASE_URL="sqlite+aiosqlite:///./dev.db" uvicorn app.main:app --reload
```

**Frontend** (Node 22):

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173, proxies /api → localhost:8000
```

Redis is optional in dev — the backend degrades to an in-memory shim if it's
unavailable, so the whole thing runs offline.

---

## 🗂 Structure

```
ClaimGuard/
├── docker-compose.yml     # full stack: db, redis, api, worker, beat, web
├── backend/               # FastAPI · SQLAlchemy 2 (async) · Postgres · Redis · Celery
│   ├── app/               # core, models, schemas, repositories, services, modules, api, workers
│   ├── migrations/        # Alembic
│   ├── scripts/seed.py    # Zimbabwe demo data
│   ├── tests/             # pytest (auth, claims, fraudshield, investigations, health)
│   └── docker/Dockerfile
└── frontend/              # React 19 · Vite · TanStack Router/Query · Tailwind
    ├── src/               # routes, components, stores, lib (api client + realtime)
    ├── Dockerfile         # build SPA → serve with nginx (+ /api & /ws proxy)
    └── nginx.conf
```

See [`backend/README.md`](backend/README.md) and
[`backend/docs/`](backend/docs) (ARCHITECTURE, API, DEPLOYMENT) for detail.

---

## ✅ Testing & quality

```bash
# Backend
cd backend && source .venv/bin/activate
pytest            # test suite (SQLite-backed, no external services)
ruff check app    # lint

# Frontend
cd frontend
npx tsc --noEmit  # type-check
npm run build     # production build
```

---

## 🔐 Security notes for production

This repo ships demo defaults for convenience. Before any real deployment:

- Set a strong `JWT_SECRET_KEY` (e.g. `openssl rand -hex 32`) via secrets, not env files.
- Change/disable the seeded demo credentials; set `SEED_ON_STARTUP=false`.
- Restrict `CORS_ORIGINS` to your real front-end origin(s).
- Put TLS in front of the web tier; review the read-endpoint auth policy for PHI.

---

## 🧰 Tech stack

**Frontend:** React 19, Vite, TypeScript, TanStack Router + Query, Tailwind CSS, Zustand, Recharts, nginx.
**Backend:** Python 3.12, FastAPI, SQLAlchemy 2 (async), PostgreSQL, Redis, Celery, Alembic, Pydantic v2, JWT + Argon2, structlog, Prometheus.
