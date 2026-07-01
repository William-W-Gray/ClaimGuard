"""Investigation workflow service."""
from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.models.investigation import Investigation, InvestigationComment
from app.repositories.claim import ClaimRepository
from app.repositories.investigation import (
    CommentRepository,
    InvestigationRepository,
)
from app.schemas.investigation import CommentOut, InvestigationOut
from app.services.notifications import NotificationService

_TERMINAL = {"RESOLVED", "CLOSED"}


def _to_dict(inv: Investigation) -> dict:
    claim = inv.claim
    return InvestigationOut(
        id=str(inv.id),
        claim_id=str(inv.claim_id),
        claim_ref=claim.claim_ref if claim else None,
        decision=claim.decision if claim else None,
        risk_score=claim.risk_score if claim else None,
        member_name=claim.member.name if claim and claim.member else None,
        provider_name=claim.provider.name if claim and claim.provider else None,
        claimed_amount=float(claim.claimed_amount) if claim else None,
        assigned_to=str(inv.assigned_to) if inv.assigned_to else None,
        assigned_to_name=inv.assignee.full_name if inv.assignee else None,
        status=inv.status,
        priority=inv.priority,
        resolution=inv.resolution,
        resolution_notes=inv.resolution_notes,
        resolved_at=inv.resolved_at,
        created_at=inv.created_at,
        comments=[
            CommentOut(
                id=str(c.id),
                author_name=c.author_name,
                body=c.body,
                created_at=c.created_at,
            )
            for c in inv.comments
        ],
    ).model_dump(by_alias=True)


class InvestigationService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repo = InvestigationRepository(session)
        self.comments = CommentRepository(session)
        self.claims = ClaimRepository(session)
        self.notifications = NotificationService(session)

    async def _notify_assignment(self, inv: Investigation, assignee_id: str, actor: str) -> None:
        """Notify a user their case was assigned — unless they assigned it themselves."""
        if not assignee_id or assignee_id == actor:
            return
        claim_ref = inv.claim.claim_ref if inv.claim else "a claim"
        await self.notifications.create(
            user_id=assignee_id,
            title="📋 Case Assigned to You",
            message=f"You've been assigned the investigation for claim {claim_ref}.",
            type_="info",
            link=f"/investigations/{inv.id}",
        )

    async def list_page(
        self, *, status: str | None, page: int, page_size: int
    ) -> tuple[list[dict], int]:
        offset = (max(page, 1) - 1) * page_size
        rows, total = await self.repo.list_page(
            status=status, offset=offset, limit=page_size
        )
        return [_to_dict(i) for i in rows], total

    async def get(self, investigation_id: str) -> dict:
        inv = await self.repo.get(investigation_id)
        if not inv:
            raise NotFoundError("Investigation not found")
        return _to_dict(inv)

    async def open_case(
        self, claim_ref: str, priority: str, assigned_to: str | None, actor: str
    ) -> dict:
        claim = await self.claims.get_by_ref(claim_ref)
        if not claim:
            raise NotFoundError(f"Claim {claim_ref} not found")
        existing = await self.repo.get_by_claim(claim.id)
        if existing:
            return _to_dict(existing)
        inv = await self.repo.create(
            claim_id=claim.id,
            assigned_to=assigned_to,
            priority=priority or claim.priority,
            status="OPEN",
            created_by=actor,
        )
        await self.session.flush()
        # Reload so the claim relationship (selectin) is populated for _to_dict.
        inv = await self.repo.get(inv.id)
        if assigned_to:
            await self._notify_assignment(inv, assigned_to, actor)
        return _to_dict(inv)

    async def update(self, investigation_id: str, actor: str, **changes) -> dict:
        inv = await self.repo.get(investigation_id)
        if not inv:
            raise NotFoundError("Investigation not found")
        prev_assignee = str(inv.assigned_to) if inv.assigned_to else None
        for key, value in changes.items():
            if value is None:
                continue
            # Empty string on assigned_to means "unassign".
            if key == "assigned_to" and value == "":
                inv.assigned_to = None
            else:
                setattr(inv, key, value)
        if inv.status in _TERMINAL and inv.resolved_at is None:
            inv.resolved_at = datetime.now(UTC)
        inv.updated_by = actor
        await self.session.flush()
        # Refresh the assignee relationship so its name reflects the new assigned_to.
        await self.session.refresh(inv, attribute_names=["assignee"])
        new_assignee = str(inv.assigned_to) if inv.assigned_to else None
        if new_assignee and new_assignee != prev_assignee:
            await self._notify_assignment(inv, new_assignee, actor)
        return _to_dict(inv)

    async def add_comment(
        self, investigation_id: str, body: str, author_id: str, author_name: str
    ) -> dict:
        inv = await self.repo.get(investigation_id)
        if not inv:
            raise NotFoundError("Investigation not found")
        inv.comments.append(
            InvestigationComment(
                investigation_id=inv.id,
                author_id=author_id,
                author_name=author_name,
                body=body,
            )
        )
        await self.session.flush()
        return _to_dict(inv)
