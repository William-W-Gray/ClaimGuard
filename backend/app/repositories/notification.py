"""Notification + audit repositories."""
from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import func, or_, select, update

from app.models.audit import AuditLog
from app.models.notification import Notification
from app.models.user import User
from app.repositories.base import BaseRepository


class NotificationRepository(BaseRepository[Notification]):
    model = Notification

    def _visible(self, user_id):  # noqa: ANN001
        """A user sees their own notifications plus broadcasts (user_id IS NULL)."""
        return or_(Notification.user_id == user_id, Notification.user_id.is_(None))

    async def list_for_user(
        self, user_id, *, offset: int = 0, limit: int = 20  # noqa: ANN001
    ) -> tuple[list[Notification], int]:
        base = select(Notification).where(
            Notification.deleted_at.is_(None), self._visible(user_id)
        )
        total = int(
            (
                await self.session.execute(
                    select(func.count()).select_from(base.subquery())
                )
            ).scalar_one()
        )
        rows = list(
            (
                await self.session.execute(
                    base.order_by(Notification.created_at.desc()).offset(offset).limit(limit)
                )
            )
            .scalars()
            .all()
        )
        return rows, total

    async def unread_count(self, user_id) -> int:  # noqa: ANN001
        stmt = select(func.count()).select_from(Notification).where(
            Notification.deleted_at.is_(None),
            self._visible(user_id),
            Notification.read.is_(False),
        )
        return int((await self.session.execute(stmt)).scalar_one())

    async def mark_all_read(self, user_id) -> None:  # noqa: ANN001
        stmt = (
            update(Notification)
            .where(
                Notification.deleted_at.is_(None),
                self._visible(user_id),
                Notification.read.is_(False),
            )
            .values(read=True)
        )
        await self.session.execute(stmt)

    async def clear_for_user(self, user_id) -> None:  # noqa: ANN001
        """Soft-delete everything currently visible to the user."""
        stmt = (
            update(Notification)
            .where(Notification.deleted_at.is_(None), self._visible(user_id))
            .values(deleted_at=datetime.now(UTC))
        )
        await self.session.execute(stmt)


class AuditRepository(BaseRepository[AuditLog]):
    model = AuditLog

    async def recent(self, limit: int = 50) -> list[AuditLog]:
        stmt = select(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit)
        return list((await self.session.execute(stmt)).scalars().all())

    async def by_entity(
        self,
        entity_type: str,
        entity_id: str,
        *,
        exclude_id=None,  # noqa: ANN001
        limit: int = 50,
    ) -> list[AuditLog]:
        """The full audit history of one record (same entity_type + entity_id) —
        the context an investigator needs when drilling into a single event."""
        stmt = select(AuditLog).where(
            AuditLog.entity_type == entity_type,
            AuditLog.entity_id == entity_id,
        )
        if exclude_id is not None:
            stmt = stmt.where(AuditLog.id != exclude_id)
        stmt = stmt.order_by(AuditLog.created_at.desc()).limit(limit)
        return list((await self.session.execute(stmt)).scalars().all())

    def _filtered(
        self,
        base,  # noqa: ANN001
        *,
        query: str | None,
        action: str | None,
        entity_type: str | None,
        date_from: datetime | None,
        date_to: datetime | None,
    ):
        """Apply the shared audit filters. Person search matches the acting user's
        name/email (via an outer join) or the recorded actor_email."""
        stmt = base.outerjoin(User, AuditLog.actor_id == User.id)
        if query:
            like = f"%{query.strip()}%"
            stmt = stmt.where(
                or_(
                    User.full_name.ilike(like),
                    User.email.ilike(like),
                    AuditLog.actor_email.ilike(like),
                )
            )
        if action:
            stmt = stmt.where(AuditLog.action == action)
        if entity_type:
            stmt = stmt.where(AuditLog.entity_type == entity_type)
        if date_from:
            stmt = stmt.where(AuditLog.created_at >= date_from)
        if date_to:
            stmt = stmt.where(AuditLog.created_at <= date_to)
        return stmt

    async def search(
        self,
        *,
        query: str | None = None,
        action: str | None = None,
        entity_type: str | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
        offset: int = 0,
        limit: int = 50,
    ) -> tuple[list[AuditLog], int]:
        filters = {
            "query": query,
            "action": action,
            "entity_type": entity_type,
            "date_from": date_from,
            "date_to": date_to,
        }
        total = (
            await self.session.execute(
                self._filtered(select(func.count(AuditLog.id)), **filters)
            )
        ).scalar_one()
        rows = (
            await self.session.execute(
                self._filtered(select(AuditLog), **filters)
                .order_by(AuditLog.created_at.desc())
                .offset(offset)
                .limit(limit)
            )
        ).scalars().all()
        return list(rows), int(total)

    async def distinct_filters(self) -> dict[str, list[str]]:
        """The distinct action and entity_type values present, for filter menus.
        Keys are camelCase to match the frontend contract (this is a raw dict, so
        the response envelope does not alias it)."""
        actions = (
            await self.session.execute(
                select(AuditLog.action).distinct().order_by(AuditLog.action)
            )
        ).scalars().all()
        entities = (
            await self.session.execute(
                select(AuditLog.entity_type).distinct().order_by(AuditLog.entity_type)
            )
        ).scalars().all()
        return {"actions": list(actions), "entityTypes": list(entities)}
