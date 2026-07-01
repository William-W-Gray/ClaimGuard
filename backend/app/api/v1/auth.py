"""Authentication endpoints."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Request

from app.core.dependencies import CurrentUserDep, DbSession, require_roles
from app.core.responses import success
from app.repositories.user import UserRepository
from app.schemas.auth import (
    LoginRequest,
    RefreshRequest,
    UserCreate,
    UserOut,
)
from app.services.audit import AuditService
from app.services.auth import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", summary="Authenticate and receive tokens")
async def login(payload: LoginRequest, request: Request, db: DbSession) -> dict:
    service = AuthService(db)
    tokens = await service.login(payload.email, payload.password)
    await AuditService(db).record(
        action="auth.login",
        entity_type="user",
        actor_email=payload.email,
        request_id=getattr(request.state, "request_id", None),
    )
    return success(tokens, "Login successful")


@router.post("/refresh", summary="Rotate refresh token")
async def refresh(payload: RefreshRequest, db: DbSession) -> dict:
    tokens = await AuthService(db).refresh(payload.refresh_token)
    return success(tokens, "Token refreshed")


@router.post("/logout", summary="Revoke refresh token")
async def logout(payload: RefreshRequest, db: DbSession) -> dict:
    await AuthService(db).logout(payload.refresh_token)
    return success(None, "Logged out")


@router.get("/me", summary="Current authenticated user")
async def me(user: CurrentUserDep, db: DbSession) -> dict:
    db_user = await UserRepository(db).get(user.id)
    if not db_user:
        return success(None, "User not found")
    out = UserOut(
        id=str(db_user.id),
        email=db_user.email,
        full_name=db_user.full_name,
        is_active=db_user.is_active,
        is_superuser=db_user.is_superuser,
        roles=db_user.role_names,
        permissions=db_user.permission_codes,
        last_login_at=db_user.last_login_at,
    )
    return success(out.model_dump(by_alias=True), "OK")


@router.post(
    "/users",
    summary="Create a user (admin only)",
    dependencies=[Depends(require_roles("admin"))],
)
async def create_user(payload: UserCreate, db: DbSession) -> dict:
    user = await AuthService(db).create_user(
        email=payload.email,
        full_name=payload.full_name,
        password=payload.password,
        role_names=payload.roles,
    )
    return success({"id": str(user.id), "email": user.email}, "User created")
