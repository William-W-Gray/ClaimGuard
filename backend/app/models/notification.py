"""Persistent notifications (replaces the frontend in-memory uiStore)."""
from __future__ import annotations

import uuid

from sqlalchemy import Boolean, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import GUID, BaseEntity


class Notification(BaseEntity):
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        GUID, ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(255))
    message: Mapped[str] = mapped_column(Text)
    type: Mapped[str] = mapped_column(String(16), default="info")  # info|warning|alert
    channel: Mapped[str | None] = mapped_column(String(16))  # WHATSAPP|SMS|USSD|...
    link: Mapped[str | None] = mapped_column(String(255))
    read: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    delivered: Mapped[bool] = mapped_column(Boolean, default=False)
