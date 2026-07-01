"""Audit logging helper — record every state-changing action."""
from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

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
