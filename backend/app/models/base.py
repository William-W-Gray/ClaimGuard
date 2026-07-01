"""Declarative base + reusable mixins (UUID pk, timestamps, audit, soft delete)."""
from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime, String, Uuid, func
from sqlalchemy.orm import DeclarativeBase, Mapped, declared_attr, mapped_column
from sqlalchemy.types import TypeDecorator


def utcnow() -> datetime:
    return datetime.now(UTC)


class GUID(TypeDecorator):
    """UUID column that also accepts string input (e.g. IDs from JWT/path params).

    Delegates storage to SQLAlchemy's dialect-aware ``Uuid`` (native on Postgres,
    CHAR(32) on SQLite) but coerces ``str`` → ``uuid.UUID`` on bind.
    """

    impl = Uuid
    cache_ok = True

    def process_bind_param(self, value, dialect):  # noqa: ANN001
        if value is None or isinstance(value, uuid.UUID):
            return value
        return uuid.UUID(str(value))


class Base(DeclarativeBase):
    """Shared declarative base for all ORM models."""

    @declared_attr.directive
    def __tablename__(cls) -> str:  # noqa: N805
        # CamelCase -> snake_case + naive pluralization
        name = cls.__name__
        snake = "".join(f"_{c.lower()}" if c.isupper() else c for c in name).lstrip("_")
        return snake if snake.endswith("s") else f"{snake}s"


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=utcnow,
        nullable=False,
    )


class AuditMixin:
    created_by: Mapped[str | None] = mapped_column(String(64), nullable=True)
    updated_by: Mapped[str | None] = mapped_column(String(64), nullable=True)


class SoftDeleteMixin:
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, index=True
    )

    @property
    def is_deleted(self) -> bool:
        return self.deleted_at is not None


class UUIDPrimaryKey:
    id: Mapped[uuid.UUID] = mapped_column(
        GUID, primary_key=True, default=uuid.uuid4
    )


class BaseEntity(Base, UUIDPrimaryKey, TimestampMixin, AuditMixin, SoftDeleteMixin):
    """Every domain table inherits this: id, timestamps, audit, soft-delete."""

    __abstract__ = True
