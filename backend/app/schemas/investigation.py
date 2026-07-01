"""Investigation workflow schemas."""
from __future__ import annotations

from datetime import datetime

from app.schemas.common import CamelModel, StrId


class CommentOut(CamelModel):
    id: str
    author_name: str | None = None
    body: str
    created_at: datetime


class CommentCreate(CamelModel):
    body: str


class InvestigationOut(CamelModel):
    id: str
    claim_id: str
    claim_ref: str | None = None
    decision: str | None = None
    risk_score: int | None = None
    member_name: str | None = None
    provider_name: str | None = None
    claimed_amount: float | None = None
    assigned_to: str | None = None
    assigned_to_name: str | None = None
    status: str
    priority: str
    resolution: str | None = None
    resolution_notes: str | None = None
    resolved_at: datetime | None = None
    created_at: datetime
    comments: list[CommentOut] = []


class InvestigationCreate(CamelModel):
    claim_id: str
    priority: str = "MEDIUM"
    assigned_to: str | None = None


class InvestigationUpdate(CamelModel):
    status: str | None = None
    priority: str | None = None
    assigned_to: str | None = None
    resolution: str | None = None
    resolution_notes: str | None = None


class NotificationOut(CamelModel):
    id: StrId
    title: str
    message: str
    type: str
    channel: str | None = None
    link: str | None = None
    read: bool
    created_at: datetime
