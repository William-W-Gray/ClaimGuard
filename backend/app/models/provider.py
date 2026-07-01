"""Healthcare provider + TrustScore reputation metrics."""
from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import GUID, BaseEntity


class Provider(BaseEntity):
    code: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255), index=True)
    type: Mapped[str] = mapped_column(String(32))  # PHARMACY | GP | SPECIALIST | ...
    city: Mapped[str] = mapped_column(String(128))

    # TrustScore reputation
    trust_score: Mapped[int] = mapped_column(Integer, default=100, index=True)
    badge: Mapped[str] = mapped_column(String(16), default="STANDARD")
    shortfall_index: Mapped[float] = mapped_column(Numeric(6, 2), default=1.0)
    dispute_rate: Mapped[float] = mapped_column(Numeric(6, 2), default=0.0)
    flags_90d: Mapped[int] = mapped_column(Integer, default=0)
    total_claims: Mapped[int] = mapped_column(Integer, default=0)
    average_claim_value: Mapped[float] = mapped_column(Numeric(14, 2), default=0)

    phone: Mapped[str | None] = mapped_column(String(32))
    address: Mapped[str | None] = mapped_column(String(255))
    registration_date: Mapped[str | None] = mapped_column(String(10))
    last_audit_date: Mapped[str | None] = mapped_column(String(10))

    claims: Mapped[list[Claim]] = relationship(  # noqa: F821
        back_populates="provider"
    )
    trustscore_history: Mapped[list[TrustScoreSnapshot]] = relationship(  # noqa: F821
        back_populates="provider", cascade="all, delete-orphan"
    )


class TrustScoreSnapshot(BaseEntity):
    """Point-in-time TrustScore for trend analysis."""

    __tablename__ = "trustscore_snapshots"

    provider_id: Mapped[uuid.UUID] = mapped_column(
        GUID, ForeignKey("providers.id", ondelete="CASCADE"), index=True
    )
    score: Mapped[int] = mapped_column(Integer)
    badge: Mapped[str] = mapped_column(String(16))
    reason: Mapped[str | None] = mapped_column(String(255))

    provider: Mapped[Provider] = relationship(back_populates="trustscore_history")
