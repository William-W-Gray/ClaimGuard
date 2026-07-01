"""API v1 router aggregation."""
from fastapi import APIRouter

from app.api.v1 import (
    auth,
    claims,
    dashboard,
    demo,
    fraudshield,
    health,
    investigations,
    members,
    notifications,
    providers,
    trustscore,
    users,
    websocket,
)

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(claims.router)
api_router.include_router(providers.router)
api_router.include_router(trustscore.router)
api_router.include_router(members.router)
api_router.include_router(dashboard.router)
api_router.include_router(fraudshield.router)
api_router.include_router(investigations.router)
api_router.include_router(users.router)
api_router.include_router(notifications.router)
api_router.include_router(demo.router)
api_router.include_router(websocket.router)
