"""Member repository."""
from __future__ import annotations

from app.models.member import Member
from app.repositories.base import BaseRepository


class MemberRepository(BaseRepository[Member]):
    model = Member

    async def get_by_number(self, member_number: str) -> Member | None:
        return await self.get_by(member_number=member_number)

    async def list_page(self, offset: int = 0, limit: int = 10) -> tuple[list[Member], int]:
        total = await self.count()
        rows = await self.list(offset=offset, limit=limit, order_by=Member.name.asc())
        return rows, total
