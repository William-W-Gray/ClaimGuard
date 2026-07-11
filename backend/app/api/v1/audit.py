"""Audit-trail endpoints — read the immutable who-did-what-when log.

Access is limited to admins and auditors: the trail is a compliance surface, so
it is searchable by person (name/email), action, entity, and time window.
"""
from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, Query

from app.core.dependencies import DbSession, PaginationDep, require_roles
from app.core.exceptions import NotFoundError
from app.core.responses import paginated, success
from app.models.audit import AuditLog
from app.repositories.notification import AuditRepository
from app.schemas.audit import AuditDetailOut, AuditOut

router = APIRouter(prefix="/audit", tags=["audit"])

_audit_access = Depends(require_roles("admin", "auditor"))


def _audit_out(entry: AuditLog) -> AuditOut:
    actor = entry.actor
    return AuditOut(
        id=str(entry.id),
        action=entry.action,
        entity_type=entry.entity_type,
        entity_id=entry.entity_id,
        actor_id=str(entry.actor_id) if entry.actor_id else None,
        actor_name=actor.full_name if actor else None,
        actor_email=entry.actor_email or (actor.email if actor else None),
        actor_roles=actor.role_names if actor else [],
        request_id=entry.request_id,
        ip_address=entry.ip_address,
        changes=entry.changes or {},
        created_at=entry.created_at,
    )


def _to_out(entry: AuditLog) -> dict:
    return _audit_out(entry).model_dump(by_alias=True)


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


@router.get(
    "/{audit_id}",
    summary="Full detail for one audit entry, with same-request context",
    dependencies=[_audit_access],
)
async def get_audit_entry(audit_id: str, db: DbSession) -> dict:
    repo = AuditRepository(db)
    entry = await repo.get(audit_id)
    if not entry:
        raise NotFoundError("Audit entry not found")
    related = (
        await repo.by_entity(entry.entity_type, entry.entity_id, exclude_id=entry.id)
        if entry.entity_id
        else []
    )
    payload = AuditDetailOut(
        entry=_audit_out(entry),
        related=[_audit_out(e) for e in related],
    )
    return success(payload.model_dump(by_alias=True), "Audit entry")
