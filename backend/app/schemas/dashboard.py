"""Dashboard & analytics schemas."""
from __future__ import annotations

from app.schemas.common import CamelModel


class DashboardMetrics(CamelModel):
    claims_today: int
    flagged_today: int
    estimated_saved: float
    member_alerts: int
    pending_investigation: int
    auto_approved_today: int
    avg_latency_ms: int
    detection_rate: float


class SavingsDataPoint(CamelModel):
    month: str
    savings: float
    cumulative: float
    target: float


class USSDStats(CamelModel):
    total_sessions: int
    confirmations: int
    disputes: int
    completed: int
    carriers: dict[str, int]


class FraudTrendPoint(CamelModel):
    label: str
    flagged: int
    confirmed: int
    saved: float
