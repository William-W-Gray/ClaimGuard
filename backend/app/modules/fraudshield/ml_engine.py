"""ML scoring adapter.

`MLEngine` is the interface the service depends on. `MockMLEngine` ships a
deterministic, dependency-free anomaly estimator so the platform runs offline.
Swap in `XGBoostMLEngine` / `IsolationForestMLEngine` later without touching
callers (Dependency Inversion).
"""
from __future__ import annotations

import math
from typing import Protocol

from app.modules.fraudshield.context import ScoringContext


class MLEngine(Protocol):
    name: str

    def anomaly_probability(self, ctx: ScoringContext) -> float:
        """Return P(anomaly) in [0, 1]."""
        ...

    def feature_weights(self, ctx: ScoringContext) -> dict[str, float]:
        """Per-feature linear contributions for explanation."""
        ...


class MockMLEngine:
    """Logistic blend of normalized features — stands in for a trained model."""

    name = "mock-logistic-v1"

    # Tuned so realistic fraud patterns land 0.6-0.95 and clean claims < 0.2.
    _COEF = {
        "shortfall_ratio": 1.9,
        "amount": 0.012,
        "provider_flags_90d": 0.11,
        "low_trust": 0.04,
        "no_biometric": 0.8,
    }
    _BIAS = -3.2

    def _features(self, ctx: ScoringContext) -> dict[str, float]:
        return {
            "shortfall_ratio": ctx.shortfall_ratio,
            "amount": ctx.claimed_amount,
            "provider_flags_90d": float(ctx.provider_flags_90d),
            "low_trust": float(max(0, 100 - ctx.provider_trust_score)),
            "no_biometric": 0.0 if ctx.has_biometric else 1.0,
        }

    def anomaly_probability(self, ctx: ScoringContext) -> float:
        feats = self._features(ctx)
        z = self._BIAS + sum(self._COEF[k] * v for k, v in feats.items())
        return 1.0 / (1.0 + math.exp(-z))

    def feature_weights(self, ctx: ScoringContext) -> dict[str, float]:
        feats = self._features(ctx)
        return {k: round(self._COEF[k] * v, 4) for k, v in feats.items()}


def get_ml_engine() -> MLEngine:
    """Factory — central place to switch model backends via config later."""
    return MockMLEngine()
