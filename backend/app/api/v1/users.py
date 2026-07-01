"""User directory endpoints (for assignment pickers, etc.)."""
from __future__ import annotations

from fastapi import APIRouter

from app.core.dependencies import CurrentUserDep, DbSession
from app.core.responses import success
from app.repositories.user import UserRepository
from app.schemas.auth import UserSummary

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", summary="List active users (for assignment)")
async def list_users(db: DbSession, _: CurrentUserDep) -> dict:
    users = await UserRepository(db).list_active()
    data = [
        UserSummary(
            id=str(u.id),
            full_name=u.full_name,
            email=u.email,
            roles=u.role_names,
        ).model_dump(by_alias=True)
        for u in users
    ]
    return success(data, "Users")
