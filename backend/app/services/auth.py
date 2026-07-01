"""Authentication service: login, refresh-token rotation, user provisioning."""
from __future__ import annotations

from datetime import UTC, datetime

import jwt
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import AuthenticationError, ConflictError
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.user import User
from app.repositories.user import (
    RefreshTokenRepository,
    RoleRepository,
    UserRepository,
)
from app.schemas.auth import TokenPair


class AuthService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.users = UserRepository(session)
        self.roles = RoleRepository(session)
        self.tokens = RefreshTokenRepository(session)

    async def authenticate(self, email: str, password: str) -> User:
        user = await self.users.get_by_email(email.lower())
        if not user or not verify_password(password, user.hashed_password):
            raise AuthenticationError("Invalid email or password")
        if not user.is_active:
            raise AuthenticationError("Account is disabled")
        return user

    async def _issue_tokens(self, user: User) -> dict:
        access = create_access_token(
            str(user.id), roles=user.role_names, permissions=user.permission_codes
        )
        refresh, jti, expires = create_refresh_token(str(user.id))
        await self.tokens.create(user_id=user.id, jti=jti, expires_at=expires)
        return TokenPair(
            access_token=access,
            refresh_token=refresh,
            token_type="bearer",
            expires_in=settings.access_token_expire_minutes * 60,
        ).model_dump(by_alias=True)

    async def login(self, email: str, password: str) -> dict:
        user = await self.authenticate(email, password)
        user.last_login_at = datetime.now(UTC)
        await self.session.flush()
        return await self._issue_tokens(user)

    async def refresh(self, refresh_token: str) -> dict:
        try:
            payload = decode_token(refresh_token, expected_type="refresh")
        except jwt.PyJWTError as exc:
            raise AuthenticationError("Invalid or expired refresh token") from exc

        jti = payload.get("jti")
        stored = await self.tokens.get_by_jti(jti) if jti else None
        if not stored or stored.revoked:
            raise AuthenticationError("Refresh token has been revoked")
        if stored.expires_at.replace(tzinfo=UTC) < datetime.now(UTC):
            raise AuthenticationError("Refresh token has expired")

        user = await self.users.get(payload["sub"])
        if not user or not user.is_active:
            raise AuthenticationError("User no longer active")

        stored.revoked = True  # rotate: one-time use
        await self.session.flush()
        return await self._issue_tokens(user)

    async def logout(self, refresh_token: str) -> None:
        try:
            payload = decode_token(refresh_token, expected_type="refresh")
        except jwt.PyJWTError:
            return
        stored = await self.tokens.get_by_jti(payload.get("jti", ""))
        if stored:
            stored.revoked = True
            await self.session.flush()

    async def create_user(
        self, email: str, full_name: str, password: str, role_names: list[str]
    ) -> User:
        if await self.users.get_by_email(email.lower()):
            raise ConflictError("A user with that email already exists")
        roles = await self.roles.get_many_by_name(role_names)
        user = User(
            email=email.lower(),
            full_name=full_name,
            hashed_password=hash_password(password),
            is_active=True,
        )
        user.roles = roles
        return await self.users.add(user)
