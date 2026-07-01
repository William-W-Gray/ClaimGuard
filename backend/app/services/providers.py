"""Provider / TrustScore application service."""
from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.core.websocket import WSEventType, publish
from app.modules.trustscore import trustscore_service
from app.modules.trustscore.service import TrustInputs
from app.repositories.claim import ClaimRepository
from app.repositories.provider import ProviderRepository
from app.schemas.claim import claim_to_summary
from app.schemas.provider import ProviderOut, TrustScoreSummary
from app.services.notifications import NotificationService


class ProviderService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repo = ProviderRepository(session)
        self.claims = ClaimRepository(session)

    async def list_page(self, page: int, page_size: int) -> tuple[list[dict], int]:
        offset = (max(page, 1) - 1) * page_size
        rows, total = await self.repo.list_ranked(offset=offset, limit=page_size)
        return [ProviderOut.model_validate(p).model_dump(by_alias=True) for p in rows], total

    async def get_by_code(self, code: str) -> dict:
        provider = await self.repo.get_by_code(code)
        if not provider:
            raise NotFoundError(f"Provider {code} not found")
        return ProviderOut.model_validate(provider).model_dump(by_alias=True)

    async def claims_for(self, code: str) -> list[dict]:
        provider = await self.repo.get_by_code(code)
        if not provider:
            raise NotFoundError(f"Provider {code} not found")
        rows = await self.claims.list_by_provider(provider.id)
        return [claim_to_summary(c) for c in rows]

    async def summary(self) -> dict:
        providers = await self.repo.all_ranked()
        buckets = {"VERIFIED": 0, "STANDARD": 0, "CAUTION": 0, "REVIEW": 0, "WATCHLIST": 0}
        for p in providers:
            buckets[p.badge] = buckets.get(p.badge, 0) + 1
        return TrustScoreSummary(
            verified=buckets["VERIFIED"],
            standard=buckets["STANDARD"],
            caution=buckets["CAUTION"],
            review=buckets["REVIEW"],
            watchlist=buckets["WATCHLIST"],
            total=len(providers),
        ).model_dump(by_alias=True)

    async def recalculate(self, code: str) -> dict:
        provider = await self.repo.get_by_code(code)
        if not provider:
            raise NotFoundError(f"Provider {code} not found")
        old_score = provider.trust_score
        score, badge = trustscore_service.recompute(
            TrustInputs(
                dispute_rate=float(provider.dispute_rate),
                shortfall_index=float(provider.shortfall_index),
                flags_90d=provider.flags_90d,
                total_claims=provider.total_claims,
            )
        )
        provider.trust_score = score
        provider.badge = badge
        await self.session.flush()

        if score != old_score:
            trust_payload = {
                "provider": provider.name,
                "code": provider.code,
                "oldScore": old_score,
                "newScore": score,
            }
            publish(WSEventType.TRUSTSCORE_UPDATED, trust_payload)
            await NotificationService(self.session).create_from_event(
                "trustscore_updated", trust_payload
            )
        return ProviderOut.model_validate(provider).model_dump(by_alias=True)
