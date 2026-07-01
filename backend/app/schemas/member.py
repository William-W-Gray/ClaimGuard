"""Member schemas."""
from __future__ import annotations

from app.schemas.common import CamelModel, StrId


class MemberBase(CamelModel):
    member_number: str
    name: str
    plan: str
    city: str
    annual_benefit: float
    benefit_used: float
    conditions: list[str] = []
    phone: str
    email: str | None = None
    date_of_birth: str | None = None


class MemberCreate(MemberBase):
    pass


class MemberOut(MemberBase):
    id: StrId
    benefit_remaining: float = 0.0
