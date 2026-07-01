# ClaimGuard 360° — Architecture

## Style: Modular Monolith + Clean Architecture

A single deployable unit organised into **vertical-slice domain modules**. Each
module owns its rules and can be extracted into a microservice later without
rewrites, because dependencies point inward (Dependency Inversion).

```
        HTTP / WebSocket
              │
        ┌─────▼─────┐
        │   API v1  │   routers — thin, no business logic
        └─────┬─────┘
              │ DTOs (Pydantic)
        ┌─────▼─────┐
        │  Services │   orchestration, transactions, events
        └─────┬─────┘
              │
   ┌──────────┼───────────┐
   │          │           │
┌──▼───┐ ┌────▼─────┐ ┌───▼────────┐
│Repos │ │ Modules  │ │ WebSocket  │
│(DB)  │ │(FraudSh, │ │ gateway    │
└──┬───┘ │ TrustSc) │ └────────────┘
   │     └──────────┘
┌──▼──────────┐
│ PostgreSQL  │
└─────────────┘
```

**Rule:** Routes → Services → Repositories → Database. Routes never touch the DB
or embed business logic; repositories are the only code that talks to SQLAlchemy.

## Layers

| Layer | Responsibility | Location |
|-------|----------------|----------|
| API | HTTP contract, auth guards, validation | `app/api/v1` |
| Schemas | DTOs / serialization (camelCase) | `app/schemas` |
| Services | Use-cases, transactions, publishing events | `app/services` |
| Modules | Domain engines (scoring, reputation) | `app/modules` |
| Repositories | Data access, queries, pagination, soft delete | `app/repositories` |
| Models | ORM entities + mixins | `app/models` |
| Core | Cross-cutting infra | `app/core` |

## FraudShield pipeline (explainable AI)

```
ScoringContext
   → RuleEngine         deterministic clinical/financial rules → flags + points
   → MLEngine (adapter) anomaly probability (MockMLEngine now; XGBoost/IForest later)
   → DecisionEngine     fuse (60% rules / 40% ML) → risk score, level, decision, priority
   → ExplanationEngine  SHAP-style contributions + natural-language narrative
   → ScoringResult
```

The ML backend is a `Protocol` (`MLEngine`) resolved by `get_ml_engine()`. Swapping
in a trained model requires implementing two methods — no caller changes.

## Data model

Every table inherits `BaseEntity`: **UUID** primary key, `created_at`, `updated_at`,
`created_by`, `updated_by`, `deleted_at` (**soft delete**). Foreign keys, indexes and
constraints are declared on the models; Alembic manages migrations.

Core aggregates: `User/Role/Permission/RefreshToken`, `Member`, `Provider
(+TrustScoreSnapshot)`, `Claim (+ClaimItem, ClaimFlag, ShapContribution,
TimelineEvent)`, `Investigation (+Comment)`, `Notification`, `AuditLog`.

## Cross-cutting concerns

- **Security** — Argon2 hashes, JWT access (short) + refresh (rotating, revocable), RBAC guards.
- **Errors** — domain exception hierarchy → global handlers → consistent envelope; no stack traces leak.
- **Observability** — structlog with request/correlation IDs, timing header, Prometheus metrics.
- **Resilience** — Redis fallback shim, rate limiting that fails open, graceful WS disconnects.
- **Audit** — every state change recorded in `audit_logs`.

## Realtime

`ConnectionManager` tracks sockets and broadcasts typed events
(`claim_scored`, `queue_updated`, `member_response`, `trustscore_updated`,
`dashboard_updated`, `notification_sent`, `system_health`). Services call
`publish(...)`; the demo module scripts investor storylines.
