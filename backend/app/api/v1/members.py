"""Member endpoints."""
from __future__ import annotations

from fastapi import APIRouter, Request

from app.core.dependencies import CurrentUserDep, DbSession, PaginationDep
from app.core.responses import paginated, success
from app.services.audit import AuditService
from app.services.members import MemberService

router = APIRouter(prefix="/members", tags=["members"])


@router.get("", summary="Paginated members")
async def list_members(db: DbSession, pagination: PaginationDep) -> dict:
    items, total = await MemberService(db).list_page(
        pagination.page, pagination.page_size
    )
    return paginated(items, pagination.page, pagination.page_size, total, "Members")


@router.get("/{member_id}", summary="Member detail")
async def get_member(
    member_id: str, db: DbSession, user: CurrentUserDep, request: Request
) -> dict:
    data = await MemberService(db).get(member_id)
    await AuditService(db).record_view(
        entity_type="member", entity_id=member_id, actor_id=user.id, request=request
    )
    return success(data, "Member detail")


@router.get("/{member_id}/claims", summary="Member claim history")
async def member_claims(
    member_id: str, db: DbSession, user: CurrentUserDep, request: Request
) -> dict:
    data = await MemberService(db).claims_for(member_id)
    await AuditService(db).record_view(
        entity_type="member.claims",
        entity_id=member_id,
        actor_id=user.id,
        request=request,
    )
    return success(data, "Member claims")
