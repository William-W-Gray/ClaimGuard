"""Health & observability endpoints: liveness, readiness, metrics."""
from __future__ import annotations

from fastapi import APIRouter, Response
from prometheus_client import CONTENT_TYPE_LATEST, Gauge, generate_latest

from app.core.config import settings
from app.core.database import ping_db
from app.core.redis import redis_client
from app.core.responses import success
from app.core.websocket import manager

router = APIRouter(prefix="/health", tags=["health"])

_ws_gauge = Gauge("claimguard_ws_connections", "Active WebSocket connections")


@router.get("/liveness", summary="Liveness probe")
async def liveness() -> dict:
    return success({"status": "alive"}, "Service is alive")


@router.get("/readiness", summary="Readiness probe")
async def readiness(response: Response) -> dict:
    db_ok = await ping_db()
    redis_ok = await redis_client.ping()
    ready = db_ok  # Redis degrades gracefully; DB is required
    if not ready:
        response.status_code = 503
    return {
        "success": ready,
        "message": "ready" if ready else "not ready",
        "data": {
            "database": "up" if db_ok else "down",
            "redis": "up" if redis_ok else "degraded",
        },
        "metadata": {"environment": settings.environment, "version": settings.version},
        "errors": [],
    }


@router.get("/", summary="Aggregate health")
async def health() -> dict:
    return success(
        {
            "service": settings.app_name,
            "version": settings.version,
            "environment": settings.environment,
            "ws_connections": manager.active_count,
            "redis_fallback": redis_client.using_fallback,
        },
        "OK",
    )


@router.get("/metrics", summary="Prometheus metrics", include_in_schema=False)
async def metrics() -> Response:
    _ws_gauge.set(manager.active_count)
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)
