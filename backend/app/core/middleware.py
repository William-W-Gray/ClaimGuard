"""HTTP middleware: request-id/correlation, timing, security headers, rate limiting."""
from __future__ import annotations

import time
import uuid

import structlog
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from app.core.config import settings
from app.core.dependencies import client_ip
from app.core.logging import get_logger
from app.core.redis import redis_client
from app.core.responses import failure

log = get_logger(__name__)


class RequestContextMiddleware(BaseHTTPMiddleware):
    """Bind request_id + correlation_id, log access lines with timing."""

    async def dispatch(self, request: Request, call_next):  # noqa: ANN001
        request_id = request.headers.get("x-request-id", str(uuid.uuid4()))
        correlation_id = request.headers.get("x-correlation-id", request_id)
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(
            request_id=request_id,
            correlation_id=correlation_id,
            method=request.method,
            path=request.url.path,
        )
        request.state.request_id = request_id
        start = time.perf_counter()
        try:
            response = await call_next(request)
        finally:
            duration_ms = round((time.perf_counter() - start) * 1000, 2)
        response.headers["x-request-id"] = request_id
        response.headers["x-correlation-id"] = correlation_id
        response.headers["x-process-time-ms"] = str(duration_ms)
        log.info(
            "http.request",
            status_code=response.status_code,
            duration_ms=duration_ms,
        )
        return response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Defense-in-depth headers on every API response (nginx adds them for the SPA)."""

    async def dispatch(self, request: Request, call_next):  # noqa: ANN001
        response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "no-referrer")
        response.headers.setdefault(
            "Permissions-Policy", "geolocation=(), microphone=(), camera=()"
        )
        response.headers.setdefault("Cross-Origin-Opener-Policy", "same-origin")
        response.headers.setdefault("Cross-Origin-Resource-Policy", "same-origin")
        # API responses carry PHI — never cache them anywhere.
        if request.url.path.startswith(settings.api_v1_prefix):
            response.headers.setdefault("Cache-Control", "no-store, no-cache, must-revalidate")
            response.headers.setdefault("Pragma", "no-cache")
        if settings.is_production:
            response.headers.setdefault(
                "Strict-Transport-Security",
                "max-age=63072000; includeSubDomains; preload",
            )
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Fixed-window per-client rate limit backed by Redis (or in-memory fallback)."""

    def __init__(self, app: ASGIApp, limit_per_minute: int) -> None:
        super().__init__(app)
        self.limit = limit_per_minute

    async def dispatch(self, request: Request, call_next):  # noqa: ANN001
        if request.url.path.startswith(f"{settings.api_v1_prefix}/health"):
            return await call_next(request)

        client = client_ip(request)
        window = int(time.time() // 60)
        key = f"ratelimit:{client}:{window}"
        try:
            count = await redis_client.client.incr(key)
            if count == 1:
                await redis_client.client.expire(key, 60)
            if count > self.limit:
                return JSONResponse(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    content=failure(
                        "Rate limit exceeded. Try again shortly.",
                        [{"code": "rate_limited", "message": "Too many requests"}],
                    ),
                    headers={"Retry-After": "60"},
                )
        except Exception:  # never let rate limiting take down the API
            pass
        return await call_next(request)


def register_middleware(app: FastAPI) -> None:
    # Order matters: last added runs first (outermost).
    app.add_middleware(RateLimitMiddleware, limit_per_minute=settings.rate_limit_per_minute)
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(RequestContextMiddleware)
