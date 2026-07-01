"""Provider repository."""
from __future__ import annotations

from app.models.provider import Provider
from app.repositories.base import BaseRepository


class ProviderRepository(BaseRepository[Provider]):
    model = Provider

    async def get_by_code(self, code: str) -> Provider | None:
        return await self.get_by(code=code)

    async def list_ranked(self, offset: int = 0, limit: int = 10) -> tuple[list[Provider], int]:
        total = await self.count()
        rows = await self.list(
            offset=offset, limit=limit, order_by=Provider.trust_score.desc()
        )
        return rows, total

    async def all_ranked(self) -> list[Provider]:
        return await self.list(offset=0, limit=10_000, order_by=Provider.trust_score.desc())
