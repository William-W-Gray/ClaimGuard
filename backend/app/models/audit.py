"""Immutable audit log — every state-changing action is recorded here."""
from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import JSON, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import GUID, BaseEntity

if TYPE_CHECKING:
    from app.models.user import User


class AuditLog(BaseEntity):
    actor_id: Mapped[uuid.UUID | None] = mapped_column(
        GUID, ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    actor_email: Mapped[str | None] = mapped_column(String(255))
    action: Mapped[str] = mapped_column(String(64), index=True)  # e.g. claim.approve
    entity_type: Mapped[str] = mapped_column(String(64), index=True)
    entity_id: Mapped[str | None] = mapped_column(String(64), index=True)
    request_id: Mapped[str | None] = mapped_column(String(64))
    ip_address: Mapped[str | None] = mapped_column(String(64))
    changes: Mapped[dict] = mapped_column(JSON, default=dict)

    # Read-only link to the acting user so the trail can show a person's name even
    # when only actor_id was recorded. Eager (selectin) to keep list reads simple.
    actor: Mapped[User | None] = relationship(
        "User", lazy="selectin", viewonly=True
    )
