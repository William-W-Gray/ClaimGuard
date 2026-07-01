"""Audit-trail endpoint (admin only) — read the immutable access/action log."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from app.core.dependencies import DbSession, require_roles
from app.core.responses import success
from app.repositories.notification import AuditRepository
from app.schemas.audit import AuditOut

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get(
    "",
    summary="Recent audit-log entries (admin only)",
    dependencies=[Depends(require_roles("admin"))],
)
async def list_audit(db: DbSession, limit: int = Query(50, ge=1, le=500)) -> dict:
    entries = await AuditRepository(db).recent(limit)
    data = [AuditOut.model_validate(e).model_dump(by_alias=True) for e in entries]
    return success(data, "Audit log")
