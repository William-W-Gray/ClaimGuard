"""Investigation + comment repositories."""
from __future__ import annotations

from app.models.investigation import Investigation, InvestigationComment
from app.repositories.base import BaseRepository


class InvestigationRepository(BaseRepository[Investigation]):
    model = Investigation

    async def list_page(
        self, *, status: str | None = None, offset: int = 0, limit: int = 10
    ) -> tuple[list[Investigation], int]:
        filters = {"status": status} if status and status != "ALL" else {}
        total = await self.count(**filters)
        rows = await self.list(
            offset=offset,
            limit=limit,
            order_by=Investigation.created_at.desc(),
            **filters,
        )
        return rows, total

    async def get_by_claim(self, claim_id) -> Investigation | None:  # noqa: ANN001
        return await self.get_by(claim_id=claim_id)


class CommentRepository(BaseRepository[InvestigationComment]):
    model = InvestigationComment
