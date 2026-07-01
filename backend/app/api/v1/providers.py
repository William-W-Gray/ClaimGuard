"""Provider endpoints."""
from __future__ import annotations

from fastapi import APIRouter

from app.core.dependencies import DbSession, PaginationDep
from app.core.responses import paginated, success
from app.services.providers import ProviderService

router = APIRouter(prefix="/providers", tags=["providers"])


@router.get("", summary="Paginated providers (ranked by TrustScore)")
async def list_providers(db: DbSession, pagination: PaginationDep) -> dict:
    items, total = await ProviderService(db).list_page(
        pagination.page, pagination.page_size
    )
    return paginated(items, pagination.page, pagination.page_size, total, "Providers")


@router.get("/{code}", summary="Provider detail by code")
async def get_provider(code: str, db: DbSession) -> dict:
    return success(await ProviderService(db).get_by_code(code), "Provider detail")


@router.get("/{code}/claims", summary="Recent claims for a provider")
async def provider_claims(code: str, db: DbSession) -> dict:
    return success(await ProviderService(db).claims_for(code), "Provider claims")
