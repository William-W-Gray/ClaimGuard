"""Member (medical-aid scheme beneficiary)."""
from __future__ import annotations

from sqlalchemy import JSON, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseEntity


class Member(BaseEntity):
    member_number: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255), index=True)
    plan: Mapped[str] = mapped_column(String(16))  # GOLD | SILVER | BRONZE
    city: Mapped[str] = mapped_column(String(128))
    annual_benefit: Mapped[float] = mapped_column(Numeric(14, 2), default=0)
    benefit_used: Mapped[float] = mapped_column(Numeric(14, 2), default=0)
    conditions: Mapped[list[str]] = mapped_column(JSON, default=list)
    phone: Mapped[str] = mapped_column(String(32))
    email: Mapped[str | None] = mapped_column(String(255))
    date_of_birth: Mapped[str | None] = mapped_column(String(10))

    claims: Mapped[list[Claim]] = relationship(  # noqa: F821
        back_populates="member"
    )

    @property
    def benefit_remaining(self) -> float:
        return float(self.annual_benefit) - float(self.benefit_used)
