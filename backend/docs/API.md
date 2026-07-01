# ClaimGuard 360° — API Guide

Base URL: `/api/v1` · Interactive docs: `/docs` (Swagger) · `/redoc`

## Response envelope

Every JSON response uses:

```json
{
  "success": true,
  "message": "OK",
  "data": {},
  "metadata": { "pagination": { "page": 1, "pageSize": 10, "totalItems": 42,
                                "totalPages": 5, "hasNext": true, "hasPrev": false } },
  "errors": []
}
```

Errors set `success: false` and populate `errors: [{ code, message, field? }]`.

## Authentication

| Method | Path | Body | Notes |
|--------|------|------|-------|
| POST | `/auth/login` | `{email, password}` | → `{accessToken, refreshToken, expiresIn}` |
| POST | `/auth/refresh` | `{refreshToken}` | rotates (single-use) |
| POST | `/auth/logout` | `{refreshToken}` | revokes |
| GET | `/auth/me` | — | current profile (Bearer) |
| POST | `/auth/users` | `{email, fullName, password, roles}` | admin only |

Send `Authorization: Bearer <accessToken>` on protected routes.

## Pagination

List endpoints accept `?page=` (≥1) and `?page_size=` (1–100; UI offers 5/10/15/20/25/50).

## Endpoints

### Claims
- `GET /claims?search=&priority=&status=&page=&page_size=` — paginated queue
- `GET /claims/live-feed?limit=` — recent scored claims
- `GET /claims/{claimRef}` — full detail (items, flags, SHAP, timeline)
- `POST /claims/{claimRef}/approve` 🔒
- `POST /claims/{claimRef}/reject` 🔒 `{reason: REJECT_FRAUD|REJECT_ERROR}`
- `POST /claims/{claimRef}/notes` 🔒 `{note}`
- `POST /claims/{claimRef}/rescore` 🔒 — re-run FraudShield

### FraudShield
- `POST /fraudshield/score` — score an ad-hoc payload, returns risk + flags + SHAP + explanation

### Providers / TrustScore
- `GET /providers?page=&page_size=` · `GET /providers/{code}` · `GET /providers/{code}/claims`
- `GET /trustscore` · `GET /trustscore/summary` · `POST /trustscore/{code}/recalculate` 🔒

### Members
- `GET /members` · `GET /members/{id}` · `GET /members/{id}/claims`

### Dashboard
- `GET /dashboard/metrics` · `GET /dashboard/savings` · `GET /dashboard/ussd`

### Investigations 🔒
- `GET /investigations?status=&page=&page_size=` · `POST /investigations`
- `GET /investigations/{id}` · `PATCH /investigations/{id}` · `POST /investigations/{id}/comments`

### Notifications 🔒
- `GET /notifications` (metadata includes `unread`) · `POST /notifications/{id}/read` · `POST /notifications/read-all`

### Demo
- `GET /demo/scenarios` · `POST /demo/scenarios/{id}/run` (fires realtime events)

### Health
- `GET /health/liveness` · `/health/readiness` · `/health` · `/health/metrics` (Prometheus)

### WebSocket
- `WS /api/v1/ws` — receives `{id, type, timestamp, payload}` events; send `"ping"` → `{"type":"pong"}`.

🔒 = requires authentication (some require `admin`/`analyst` roles).
