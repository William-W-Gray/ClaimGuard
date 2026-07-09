"""Claims application service — queue, detail, lifecycle actions, scoring."""
from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BusinessRuleError, NotFoundError
from app.core.websocket import WSEventType, publish
from app.models.claim import Claim, ClaimFlag, ShapContribution, TimelineEvent
from app.modules.fraudshield import ScoringContext, ScoringResult
from app.modules.fraudshield.service import fraudshield_service
from app.repositories.claim import ClaimRepository
from app.schemas.claim import claim_to_detail, claim_to_summary
from app.services.notifications import NotificationService

_REJECT_REASONS = {"REJECT_FRAUD", "REJECT_ERROR"}


class ClaimService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repo = ClaimRepository(session)

    # ── Reads ─────────────────────────────────────────────────────────────────
    async def queue(
        self,
        *,
        search: str | None,
        priority: str | None,
        status: str | None,
        page: int,
        page_size: int,
    ) -> tuple[list[dict], int]:
        offset = (max(page, 1) - 1) * page_size
        rows, total = await self.repo.query_queue(
            search=search,
            priority=priority,
            status=status,
            offset=offset,
            limit=page_size,
        )
        return [claim_to_summary(c) for c in rows], total

    async def live_feed(self, limit: int = 5) -> list[dict]:
        rows = await self.repo.recent(limit=limit)
        return [claim_to_summary(c) for c in rows]

    async def get_detail(self, claim_ref: str) -> dict:
        claim = await self.repo.get_by_ref(claim_ref)
        if not claim:
            raise NotFoundError(f"Claim {claim_ref} not found")
        return claim_to_detail(claim)

    # ── Lifecycle actions ──────────────────────────────────────────────────────
    async def _add_timeline(
        self, claim: Claim, event: str, description: str, actor: str, type_: str = "agent"
    ) -> None:
        claim.timeline.append(
            TimelineEvent(
                claim_id=claim.id,
                timestamp=datetime.now(UTC),
                event=event,
                description=description,
                actor=actor,
                type=type_,
            )
        )

    async def approve(self, claim_ref: str, actor: str) -> dict:
        claim = await self.repo.get_by_ref(claim_ref)
        if not claim:
            raise NotFoundError(f"Claim {claim_ref} not found")
        if claim.decision == "APPROVE":
            raise BusinessRuleError("Claim is already approved")

        claim.decision = "APPROVE"
        claim.approved_amount = claim.claimed_amount
        claim.updated_by = actor
        await self._add_timeline(
            claim, "Claim approved", f"Approved by {actor}", actor
        )
        await self.session.flush()

        publish(WSEventType.QUEUE_UPDATED, {"claimRef": claim_ref, "decision": "APPROVE"})
        publish(WSEventType.DASHBOARD_UPDATED, {"reason": "claim_approved"})
        return claim_to_detail(claim)

    async def reject(self, claim_ref: str, reason: str, actor: str) -> dict:
        if reason not in _REJECT_REASONS:
            raise BusinessRuleError(f"Invalid rejection reason: {reason}")
        claim = await self.repo.get_by_ref(claim_ref)
        if not claim:
            raise NotFoundError(f"Claim {claim_ref} not found")

        claim.decision = reason
        claim.approved_amount = 0
        claim.updated_by = actor
        await self._add_timeline(
            claim, "Claim rejected", f"Rejected ({reason}) by {actor}", actor
        )
        await self.session.flush()

        publish(WSEventType.QUEUE_UPDATED, {"claimRef": claim_ref, "decision": reason})
        publish(WSEventType.DASHBOARD_UPDATED, {"reason": "claim_rejected"})
        return claim_to_detail(claim)

    async def add_note(self, claim_ref: str, note: str, actor: str) -> dict:
        claim = await self.repo.get_by_ref(claim_ref)
        if not claim:
            raise NotFoundError(f"Claim {claim_ref} not found")
        claim.agent_notes = note
        await self._add_timeline(claim, "Note added", note, actor)
        await self.session.flush()
        return claim_to_detail(claim)

    # ── Scoring (FraudShield) ──────────────────────────────────────────────────
    @staticmethod
    def context_from_claim(claim: Claim) -> ScoringContext:
        return ScoringContext(
            claim_ref=claim.claim_ref,
            claimed_amount=float(claim.claimed_amount),
            member_shortfall=float(claim.member_shortfall),
            expected_shortfall_min=float(claim.expected_shortfall_min),
            expected_shortfall_max=float(claim.expected_shortfall_max),
            provider_trust_score=claim.provider.trust_score if claim.provider else 100,
            provider_flags_90d=claim.provider.flags_90d if claim.provider else 0,
            member_conditions=claim.member.conditions if claim.member else [],
            item_descriptions=[i.description for i in claim.items],
            prescription_after_service=claim.prescription_after_service,
            has_biometric=claim.has_biometric,
            chronic_drug_no_condition=claim.chronic_drug_no_condition,
            syndicate_signal=claim.syndicate_signal,
        )

    def _apply_result(self, claim: Claim, result: ScoringResult) -> None:
        claim.risk_score = result.risk_score
        claim.risk_level = result.risk_level
        claim.decision = result.decision
        claim.priority = result.priority
        claim.ai_explanation = result.explanation
        claim.latency_ms = result.latency_ms
        claim.flags = [
            ClaimFlag(code=f.code, severity=f.severity, detail=f.detail)
            for f in result.flags
        ]
        claim.shap_contributions = [
            ShapContribution(
                feature=s.feature, contribution=s.contribution, direction=s.direction
            )
            for s in result.shap
        ]

    async def rescore(self, claim_ref: str, actor: str = "system") -> dict:
        claim = await self.repo.get_by_ref(claim_ref)
        if not claim:
            raise NotFoundError(f"Claim {claim_ref} not found")
        result = fraudshield_service.score(self.context_from_claim(claim))
        self._apply_result(claim, result)
        await self._add_timeline(
            claim,
            "FraudShield rescored",
            f"Risk {result.risk_score} → {result.decision}",
            actor,
            type_="system",
        )
        await self.session.flush()

        scored_payload = {
            "claimRef": claim.claim_ref,
            "member": claim.member.name if claim.member else "Member",
            "riskScore": result.risk_score,
            "decision": result.decision,
            "latencyMs": result.latency_ms,
        }
        publish(WSEventType.CLAIM_SCORED, scored_payload)
        await NotificationService(self.session).create_from_event(
            "claim_scored", scored_payload
        )
        return claim_to_detail(claim)
