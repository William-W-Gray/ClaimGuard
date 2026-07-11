"""Audit-trail endpoints — read the immutable who-did-what-when log.

Access is limited to admins and auditors: the trail is a compliance surface, so
it is searchable by person (name/email), action, entity, and time window.
"""
from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, Query

from app.core.dependencies import DbSession, PaginationDep, require_roles
from app.core.responses import paginated, success
from app.models.audit import AuditLog
from app.repositories.notification import AuditRepository
from app.schemas.audit import AuditOut

router = APIRouter(prefix="/audit", tags=["audit"])

_audit_access = Depends(require_roles("admin", "auditor"))


def _to_out(entry: AuditLog) -> dict:
    actor_name = entry.actor.full_name if entry.actor else None
    return AuditOut(
        id=str(entry.id),
        action=entry.action,
        entity_type=entry.entity_type,
        entity_id=entry.entity_id,
        actor_id=str(entry.actor_id) if entry.actor_id else None,
        actor_name=actor_name,
        actor_email=entry.actor_email,
        ip_address=entry.ip_address,
        changes=entry.changes or {},
        created_at=entry.created_at,
    ).model_dump(by_alias=True)


@router.get(
    "",
    summary="Search the audit trail (admin/auditor)",
    dependencies=[_audit_access],
)
async def list_audit(
    db: DbSession,
    pagination: PaginationDep,
    search: str | None = Query(None, description="Match by person name or email"),
    action: str | None = Query(None),
    entity_type: str | None = Query(None),
    date_from: datetime | None = Query(None),
    date_to: datetime | None = Query(None),
) -> dict:
    rows, total = await AuditRepository(db).search(
        query=search,
        action=action,
        entity_type=entity_type,
        date_from=date_from,
        date_to=date_to,
        offset=(pagination.page - 1) * pagination.page_size,
        limit=pagination.page_size,
    )
    data = [_to_out(e) for e in rows]
    return paginated(data, pagination.page, pagination.page_size, total, "Audit log")


@router.get(
    "/filters",
    summary="Distinct actions & entity types for filter menus",
    dependencies=[_audit_access],
)
async def audit_filters(db: DbSession) -> dict:
    return success(await AuditRepository(db).distinct_filters(), "Audit filters")
