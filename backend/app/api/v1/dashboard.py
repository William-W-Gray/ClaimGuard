"""Dashboard & analytics endpoints."""
from __future__ import annotations

from fastapi import APIRouter

from app.core.dependencies import DbSession
from app.core.responses import success
from app.services.dashboard import DashboardService

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/metrics", summary="Top-line KPIs")
async def metrics(db: DbSession) -> dict:
    return success(await DashboardService(db).metrics(), "Dashboard metrics")


@router.get("/savings", summary="Savings trend series")
async def savings(db: DbSession) -> dict:
    return success(await DashboardService(db).savings_series(), "Savings series")


@router.get("/ussd", summary="USSD engagement statistics")
async def ussd(db: DbSession) -> dict:
    return success(await DashboardService(db).ussd_stats(), "USSD stats")
