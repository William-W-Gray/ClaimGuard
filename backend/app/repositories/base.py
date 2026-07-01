"""Generic async repository: CRUD, soft-delete, pagination over SQLAlchemy 2.x."""
from __future__ import annotations

import uuid
from typing import Any, Generic, TypeVar

from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.base import BaseEntity

ModelT = TypeVar("ModelT", bound=BaseEntity)


class BaseRepository(Generic[ModelT]):
    model: type[ModelT]

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    # ── Query construction ───────────────────────────────────────────────────
    def _base_query(self, include_deleted: bool = False) -> Select:
        stmt = select(self.model)
        if not include_deleted:
            stmt = stmt.where(self.model.deleted_at.is_(None))
        return stmt

    # ── Reads ────────────────────────────────────────────────────────────────
    async def get(self, entity_id: uuid.UUID | str) -> ModelT | None:
        stmt = self._base_query().where(self.model.id == entity_id)
        return (await self.session.execute(stmt)).scalar_one_or_none()

    async def get_by(self, **filters: Any) -> ModelT | None:
        stmt = self._base_query()
        for key, value in filters.items():
            stmt = stmt.where(getattr(self.model, key) == value)
        return (await self.session.execute(stmt)).scalar_one_or_none()

    async def list(
        self,
        *,
        offset: int = 0,
        limit: int = 50,
        order_by: Any = None,
        **filters: Any,
    ) -> list[ModelT]:
        stmt = self._base_query()
        for key, value in filters.items():
            stmt = stmt.where(getattr(self.model, key) == value)
        if order_by is not None:
            stmt = stmt.order_by(order_by)
        stmt = stmt.offset(offset).limit(limit)
        return list((await self.session.execute(stmt)).scalars().all())

    async def count(self, **filters: Any) -> int:
        stmt = select(func.count()).select_from(self.model).where(
            self.model.deleted_at.is_(None)
        )
        for key, value in filters.items():
            stmt = stmt.where(getattr(self.model, key) == value)
        return int((await self.session.execute(stmt)).scalar_one())

    # ── Writes ───────────────────────────────────────────────────────────────
    async def add(self, entity: ModelT) -> ModelT:
        self.session.add(entity)
        await self.session.flush()
        return entity

    async def create(self, **data: Any) -> ModelT:
        entity = self.model(**data)
        return await self.add(entity)

    async def update(self, entity: ModelT, **data: Any) -> ModelT:
        for key, value in data.items():
            setattr(entity, key, value)
        await self.session.flush()
        return entity

    async def soft_delete(self, entity: ModelT, by: str | None = None) -> None:
        from app.models.base import utcnow

        entity.deleted_at = utcnow()
        if by:
            entity.updated_by = by
        await self.session.flush()

    async def hard_delete(self, entity: ModelT) -> None:
        await self.session.delete(entity)
        await self.session.flush()
