"""User / Role / RefreshToken repositories."""
from __future__ import annotations

from sqlalchemy import delete, func, select

from app.models.user import RefreshToken, Role, User, user_roles
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    model = User

    async def get_by_email(self, email: str) -> User | None:
        return await self.get_by(email=email.lower())

    async def list_active(self, limit: int = 200) -> list[User]:
        return await self.list(is_active=True, limit=limit, order_by=User.full_name.asc())

    async def list_all(self, limit: int = 200) -> list[User]:
        """Active and deactivated users (admin management view)."""
        return await self.list(limit=limit, order_by=User.full_name.asc())

    async def count_active_admins(self, exclude_id=None) -> int:  # noqa: ANN001
        """Number of active, non-deleted users holding the admin role."""
        stmt = (
            select(func.count(func.distinct(User.id)))
            .select_from(User)
            .join(user_roles, user_roles.c.user_id == User.id)
            .join(Role, Role.id == user_roles.c.role_id)
            .where(
                User.is_active.is_(True),
                User.deleted_at.is_(None),
                Role.name == "admin",
            )
        )
        if exclude_id is not None:
            stmt = stmt.where(User.id != exclude_id)
        return int((await self.session.execute(stmt)).scalar_one())

    async def set_roles(self, user: User, roles: list[Role]) -> None:
        """Replace a user's roles via the association table.

        Reassigning the ORM ``user.roles`` collection would lazy-load the
        back-populated ``Role.users`` side and raise a greenlet error under async;
        operating on the secondary table directly avoids that.
        """
        await self.session.execute(delete(user_roles).where(user_roles.c.user_id == user.id))
        for role in roles:
            await self.session.execute(
                user_roles.insert().values(user_id=user.id, role_id=role.id)
            )
        await self.session.flush()

    async def hard_delete_user(self, user: User) -> None:
        """Permanently remove a user and its association/token rows.

        Uses Core deletes so the ORM never has to lazily load the
        ``refresh_tokens`` cascade collection under async.
        """
        uid = user.id
        await self.session.execute(delete(user_roles).where(user_roles.c.user_id == uid))
        await self.session.execute(delete(RefreshToken).where(RefreshToken.user_id == uid))
        await self.session.execute(delete(User).where(User.id == uid))
        self.session.expunge(user)
        await self.session.flush()


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
