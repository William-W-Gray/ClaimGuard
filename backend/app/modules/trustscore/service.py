"""Provider TrustScore computation (pure functions — easily testable)."""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(slots=True)
class TrustInputs:
    dispute_rate: float       # %
    shortfall_index: float    # ratio, 1.0 == expected
    flags_90d: int
    total_claims: int


class TrustScoreService:
    @staticmethod
    def badge_for(score: int) -> str:
        if score >= 90:
            return "VERIFIED"
        if score >= 70:
            return "STANDARD"
        if score >= 50:
            return "CAUTION"
        if score >= 30:
            return "REVIEW"
        return "WATCHLIST"

    def compute(self, inp: TrustInputs) -> int:
        """Start at 100, deduct for risk signals. Clamped to [0, 100]."""
        score = 100.0
        score -= min(inp.dispute_rate * 4, 40)            # disputes hurt most
        score -= max(0.0, (inp.shortfall_index - 1.0)) * 30
        score -= min(inp.flags_90d * 1.5, 30)
        if inp.total_claims < 20:                          # thin track record
            score -= 5
        return int(round(max(0.0, min(100.0, score))))

    def recompute(self, inp: TrustInputs) -> tuple[int, str]:
        score = self.compute(inp)
        return score, self.badge_for(score)


trustscore_service = TrustScoreService()
