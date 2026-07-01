"""FraudShield scoring endpoints (stateless scoring + claim rescore)."""
from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.core.responses import success
from app.modules.fraudshield import ScoringContext
from app.modules.fraudshield.service import fraudshield_service

router = APIRouter(prefix="/fraudshield", tags=["fraudshield"])


class ScoreRequest(BaseModel):
    claim_ref: str = Field("AD-HOC", alias="claimRef")
    claimed_amount: float = Field(..., alias="claimedAmount")
    member_shortfall: float = Field(0, alias="memberShortfall")
    expected_shortfall_min: float = Field(0, alias="expectedShortfallMin")
    expected_shortfall_max: float = Field(0, alias="expectedShortfallMax")
    provider_trust_score: int = Field(100, alias="providerTrustScore")
    provider_flags_90d: int = Field(0, alias="providerFlags90d")
    prescription_after_service: bool = Field(False, alias="prescriptionAfterService")
    has_biometric: bool = Field(True, alias="hasBiometric")
    chronic_drug_no_condition: bool = Field(False, alias="chronicDrugNoCondition")
    syndicate_signal: bool = Field(False, alias="syndicateSignal")

    model_config = {"populate_by_name": True}


@router.post("/score", summary="Score an ad-hoc claim payload (explainable)")
async def score(payload: ScoreRequest) -> dict:
    ctx = ScoringContext(
        claim_ref=payload.claim_ref,
        claimed_amount=payload.claimed_amount,
        member_shortfall=payload.member_shortfall,
        expected_shortfall_min=payload.expected_shortfall_min,
        expected_shortfall_max=payload.expected_shortfall_max,
        provider_trust_score=payload.provider_trust_score,
        provider_flags_90d=payload.provider_flags_90d,
        prescription_after_service=payload.prescription_after_service,
        has_biometric=payload.has_biometric,
        chronic_drug_no_condition=payload.chronic_drug_no_condition,
        syndicate_signal=payload.syndicate_signal,
    )
    result = fraudshield_service.score(ctx)
    return success(
        {
            "riskScore": result.risk_score,
            "riskLevel": result.risk_level,
            "decision": result.decision,
            "priority": result.priority,
            "latencyMs": result.latency_ms,
            "flags": [
                {"code": f.code, "severity": f.severity, "detail": f.detail}
                for f in result.flags
            ],
            "shapContributions": [
                {
                    "feature": s.feature,
                    "contribution": s.contribution,
                    "direction": s.direction,
                }
                for s in result.shap
            ],
            "aiExplanation": result.explanation,
        },
        "Scored",
    )
