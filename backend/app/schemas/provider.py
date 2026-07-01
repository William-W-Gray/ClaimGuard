"""Provider / TrustScore schemas."""
from __future__ import annotations

from datetime import datetime

from app.schemas.common import CamelModel, StrId


class ProviderBase(CamelModel):
    code: str
    name: str
    type: str
    city: str
    trust_score: int
    badge: str
    shortfall_index: float
    dispute_rate: float
    flags_90d: int = 0  # serialized as "flags90d"
    total_claims: int
    average_claim_value: float
    phone: str | None = None
    address: str | None = None
    registration_date: str | None = None
    last_audit_date: str | None = None


class ProviderCreate(ProviderBase):
    pass


class ProviderOut(ProviderBase):
    id: StrId


class TrustScorePoint(CamelModel):
    score: int
    badge: str
    reason: str | None = None
    created_at: datetime


class TrustScoreSummary(CamelModel):
    verified: int
    standard: int
    caution: int
    review: int
    watchlist: int
    total: int
