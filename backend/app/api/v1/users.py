"""User directory endpoints (for assignment pickers, etc.)."""
from __future__ import annotations

from fastapi import APIRouter, Query

from app.core.dependencies import CurrentUserDep, DbSession
from app.core.responses import success
from app.repositories.user import UserRepository
from app.schemas.auth import UserSummary

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", summary="List users (for assignment / management)")
async def list_users(
    db: DbSession,
    _: CurrentUserDep,
    include_inactive: bool = Query(
        False, description="Include deactivated accounts (management views)"
    ),
) -> dict:
    repo = UserRepository(db)
    users = await repo.list_all() if include_inactive else await repo.list_active()
    data = [
        UserSummary(
            id=str(u.id),
            full_name=u.full_name,
            email=u.email,
            roles=u.role_names,
            is_active=u.is_active,
        ).model_dump(by_alias=True)
        for u in users
    ]
    return success(data, "Users")
