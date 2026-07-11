"""Audit-log read schema."""
from __future__ import annotations

from datetime import datetime

from app.schemas.common import CamelModel, StrId


class AuditOut(CamelModel):
    id: StrId
    action: str
    entity_type: str
    entity_id: str | None = None
    actor_id: StrId | None = None
    actor_name: str | None = None
    actor_email: str | None = None
    actor_roles: list[str] = []
    request_id: str | None = None
    ip_address: str | None = None
    changes: dict = {}
    created_at: datetime


class AuditDetailOut(CamelModel):
    """A single entry plus the sibling events from the same request, so an
    investigator can see the full context of one action in one place."""

    entry: AuditOut
    related: list[AuditOut] = []
