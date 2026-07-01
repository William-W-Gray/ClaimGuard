"""Explanation engine — SHAP-style contributions + human-readable narrative."""
from __future__ import annotations

from app.modules.fraudshield.context import Flag, ScoringContext, ShapValue

_FEATURE_LABELS = {
    "shortfall_ratio": "Member shortfall vs expected",
    "amount": "Claim amount",
    "provider_flags_90d": "Provider flag history (90d)",
    "low_trust": "Provider trust deficit",
    "no_biometric": "Missing biometric verification",
    "PROVIDER_TRUSTED": "Trusted provider (mitigating)",
}


class ExplanationEngine:
    def build_shap(
        self,
        rule_contributions: dict[str, float],
        ml_weights: dict[str, float],
    ) -> list[ShapValue]:
        merged: dict[str, float] = {}
        for source in (rule_contributions, ml_weights):
            for feature, value in source.items():
                merged[feature] = merged.get(feature, 0.0) + value

        shap: list[ShapValue] = []
        for feature, value in merged.items():
            if abs(value) < 1e-6:
                continue
            label = _FEATURE_LABELS.get(feature, feature.replace("_", " ").title())
            shap.append(
                ShapValue(
                    feature=label,
                    contribution=round(value, 4),
                    direction="positive" if value > 0 else "negative",
                )
            )
        # Largest absolute impact first.
        shap.sort(key=lambda s: abs(s.contribution), reverse=True)
        return shap[:8]

    def narrate(
        self,
        ctx: ScoringContext,
        risk_score: int,
        flags: list[Flag],
        ml_probability: float,
    ) -> str:
        if not flags and risk_score < 30:
            return (
                f"Claim {ctx.claim_ref} appears legitimate. No fraud rules triggered "
                f"and the anomaly model is confident "
                f"({(1 - ml_probability) * 100:.0f}% normal). Auto-approval is safe."
            )

        lead = (
            f"Claim {ctx.claim_ref} scored {risk_score}/100 "
            f"(anomaly probability {ml_probability * 100:.0f}%)."
        )
        reasons = []
        if any(f.code == "POTENTIAL_FRAUD_SYNDICATE_DETECTED" for f in flags):
            reasons.append(
                "pattern matches a suspected fraud syndicate active this week"
            )
        if ctx.shortfall_ratio >= 1.4:
            reasons.append(
                f"member shortfall is {ctx.shortfall_ratio:.0%} of the expected range"
            )
        if ctx.provider_flags_90d >= 10:
            reasons.append(
                f"the provider has {ctx.provider_flags_90d} flags in the last 90 days"
            )
        if ctx.prescription_after_service:
            reasons.append("the prescription is dated after the service date")
        if ctx.chronic_drug_no_condition:
            reasons.append("chronic medication was billed with no registered condition")
        if not ctx.has_biometric and ctx.claimed_amount >= 75:
            reasons.append("a high-value claim lacks biometric verification")

        body = "; ".join(reasons) if reasons else "multiple risk signals were detected"
        return f"{lead} Key drivers: {body}."
