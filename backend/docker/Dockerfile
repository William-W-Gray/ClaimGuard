# ─── ClaimGuard 360° Backend — Production image ────────────────────────────────
FROM python:3.12-slim AS base

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# System deps (build tools for argon2/asyncpg wheels fallback)
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential libpq-dev curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

RUN chmod +x ./scripts/entrypoint.sh

# Non-root runtime user
RUN useradd --create-home --uid 1000 appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD sh -c 'curl -fsS http://localhost:${PORT:-8000}/api/v1/health/liveness || exit 1'

# Run migrations (+ optional seed) then start uvicorn on ${PORT:-8000}. This makes
# the image self-sufficient on any host (Render, etc.); compose overrides nothing.
CMD ["./scripts/entrypoint.sh"]
