"""Deterministic rule engine — clinical & financial fraud heuristics.

Each rule contributes weighted risk points and (optionally) a typed flag.
Rules are data-driven so new ones can be added without touching the engine.
"""
from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass

from app.modules.fraudshield.context import Flag, ScoringContext


@dataclass(slots=True)
class Rule:
    code: str
    weight: int           # risk points if triggered
    severity: str
    description: str
    predicate: Callable[[ScoringContext], bool]


RULES: list[Rule] = [
    Rule(
        code="PRESCRIPTION_DATE_AFTER_SERVICE",
        weight=22,
        severity="HIGH",
        description="Prescription dated after the service date",
        predicate=lambda c: c.prescription_after_service,
    ),
    Rule(
        code="HIGH_VALUE_NO_BIOMETRIC",
        weight=18,
        severity="HIGH",
        description="High-value claim without biometric verification",
        predicate=lambda c: c.claimed_amount >= 75 and not c.has_biometric,
    ),
    Rule(
        code="CHRONIC_DRUG_NO_CONDITION_REGISTERED",
        weight=20,
        severity="HIGH",
        description="Chronic medication billed with no registered condition",
        predicate=lambda c: c.chronic_drug_no_condition,
    ),
    Rule(
        code="SHORTFALL_INFLATION_SUSPECTED",
        weight=16,
        severity="MEDIUM",
        description="Member shortfall materially above expected range",
        predicate=lambda c: c.shortfall_ratio >= 1.4,
    ),
    Rule(
        code="STATISTICAL_ANOMALY_DETECTED",
        weight=14,
        severity="MEDIUM",
        description="Provider flag velocity is abnormally high",
        predicate=lambda c: c.provider_flags_90d >= 10,
    ),
    Rule(
        code="POTENTIAL_FRAUD_SYNDICATE_DETECTED",
        weight=28,
        severity="CRITICAL",
        description="Pattern matches a suspected fraud syndicate",
        predicate=lambda c: c.syndicate_signal,
    ),
]


class RuleEngine:
    def __init__(self, rules: list[Rule] | None = None) -> None:
        self._rules = rules or RULES

    def evaluate(self, ctx: ScoringContext) -> tuple[int, list[Flag], dict[str, float]]:
        """Return (rule_score 0-100, flags, per-feature contributions)."""
        score = 0
        flags: list[Flag] = []
        contributions: dict[str, float] = {}
        for rule in self._rules:
            try:
                triggered = rule.predicate(ctx)
            except Exception:
                triggered = False
            if triggered:
                score += rule.weight
                flags.append(Flag(rule.code, rule.severity, rule.description))
                contributions[rule.code] = float(rule.weight)
        # Provider reputation modifier: trusted providers reduce rule pressure.
        if ctx.provider_trust_score >= 90:
            score = max(0, score - 6)
            contributions["PROVIDER_TRUSTED"] = -6.0
        return min(score, 100), flags, contributions
