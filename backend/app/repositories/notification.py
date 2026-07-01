"""Notification + audit repositories."""
from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import func, or_, select, update

from app.models.audit import AuditLog
from app.models.notification import Notification
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
