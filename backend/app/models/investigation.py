"""Investigation workflow: case assignment, comments, resolution."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import GUID, BaseEntity

if TYPE_CHECKING:
    from app.models.claim import Claim
    from app.models.user import User


class Investigation(BaseEntity):
    claim_id: Mapped[uuid.UUID] = mapped_column(
        GUID, ForeignKey("claims.id", ondelete="CASCADE"), index=True
    )
    assigned_to: Mapped[uuid.UUID | None] = mapped_column(
        GUID, ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    status: Mapped[str] = mapped_column(String(24), default="OPEN", index=True)
    # OPEN | IN_PROGRESS | ESCALATED | RESOLVED | CLOSED
    priority: Mapped[str] = mapped_column(String(16), default="MEDIUM")
    resolution: Mapped[str | None] = mapped_column(String(32))
    # CONFIRMED_FRAUD | FALSE_POSITIVE | DATA_ERROR | RECOVERED | NO_ACTION
    resolution_notes: Mapped[str | None] = mapped_column(Text)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    comments: Mapped[list[InvestigationComment]] = relationship(
        back_populates="investigation",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="InvestigationComment.created_at",
    )
    claim: Mapped[Claim] = relationship(lazy="selectin")
    assignee: Mapped[User | None] = relationship(
        lazy="selectin", foreign_keys=[assigned_to]
    )


class InvestigationComment(BaseEntity):
    investigation_id: Mapped[uuid.UUID] = mapped_column(
        GUID, ForeignKey("investigations.id", ondelete="CASCADE"), index=True
    )
    author_id: Mapped[uuid.UUID | None] = mapped_column(
        GUID, ForeignKey("users.id", ondelete="SET NULL")
    )
    author_name: Mapped[str | None] = mapped_column(String(128))
    body: Mapped[str] = mapped_column(Text)

    investigation: Mapped[Investigation] = relationship(back_populates="comments")
