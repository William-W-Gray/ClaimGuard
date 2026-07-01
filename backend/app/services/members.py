"""Member application service."""
from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.repositories.claim import ClaimRepository
from app.repositories.member import MemberRepository
from app.schemas.claim import claim_to_detail
from app.schemas.member import MemberOut


def _member_dict(member) -> dict:  # noqa: ANN001
    data = MemberOut.model_validate(member).model_dump(by_alias=True)
    data["benefitRemaining"] = member.benefit_remaining
    return data


class MemberService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repo = MemberRepository(session)
        self.claims = ClaimRepository(session)

    async def list_page(self, page: int, page_size: int) -> tuple[list[dict], int]:
        offset = (max(page, 1) - 1) * page_size
        rows, total = await self.repo.list_page(offset=offset, limit=page_size)
        return [_member_dict(m) for m in rows], total

    async def get(self, member_id: str) -> dict:
        member = await self.repo.get(member_id)
        if not member:
            raise NotFoundError(f"Member {member_id} not found")
        return _member_dict(member)

    async def claims_for(self, member_id: str) -> list[dict]:
        member = await self.repo.get(member_id)
        if not member:
            raise NotFoundError(f"Member {member_id} not found")
        rows = await self.claims.list_by_member(member.id)
        return [claim_to_detail(c) for c in rows]
