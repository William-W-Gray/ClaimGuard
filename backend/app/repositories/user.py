"""User / Role / RefreshToken repositories."""
from __future__ import annotations

from sqlalchemy import select

from app.models.user import RefreshToken, Role, User
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    model = User

    async def get_by_email(self, email: str) -> User | None:
        return await self.get_by(email=email.lower())

    async def list_active(self, limit: int = 200) -> list[User]:
        return await self.list(is_active=True, limit=limit, order_by=User.full_name.asc())


class RoleRepository(BaseRepository[Role]):
    model = Role

    async def get_by_name(self, name: str) -> Role | None:
        return await self.get_by(name=name)

    async def get_many_by_name(self, names: list[str]) -> list[Role]:
        stmt = self._base_query().where(Role.name.in_(names))
        return list((await self.session.execute(stmt)).scalars().all())


class RefreshTokenRepository(BaseRepository[RefreshToken]):
    model = RefreshToken

    async def get_by_jti(self, jti: str) -> RefreshToken | None:
        return await self.get_by(jti=jti)

    async def revoke_all_for_user(self, user_id) -> None:  # noqa: ANN001
        stmt = select(RefreshToken).where(
            RefreshToken.user_id == user_id, RefreshToken.revoked.is_(False)
        )
        for token in (await self.session.execute(stmt)).scalars().all():
            token.revoked = True
        await self.session.flush()
