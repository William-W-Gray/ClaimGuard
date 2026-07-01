"""Audit logging helper — record every state-changing action AND every PHI read."""
from __future__ import annotations

from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import client_ip
from app.repositories.notification import AuditRepository


class AuditService:
    def __init__(self, session: AsyncSession) -> None:
        self.repo = AuditRepository(session)

    async def record(
        self,
        *,
        action: str,
        entity_type: str,
        entity_id: str | None = None,
        actor_id: str | None = None,
        actor_email: str | None = None,
        request_id: str | None = None,
        ip_address: str | None = None,
        changes: dict | None = None,
    ) -> None:
        await self.repo.create(
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            actor_id=actor_id,
            actor_email=actor_email,
            request_id=request_id,
            ip_address=ip_address,
            changes=changes or {},
        )

    async def record_view(
        self,
        *,
        entity_type: str,
        entity_id: str,
        actor_id: str | None,
        request: Request,
    ) -> None:
        """Record a PHI read (who viewed which record, from where). Medical data
        access must be traceable, so detail views are logged like state changes."""
        await self.record(
            action=f"{entity_type}.view",
            entity_type=entity_type,
            entity_id=str(entity_id),
            actor_id=actor_id,
            request_id=getattr(request.state, "request_id", None),
            ip_address=client_ip(request),
        )
