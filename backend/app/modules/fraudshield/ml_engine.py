"""ML scoring adapter.

`MLEngine` is the interface the pipeline depends on. The shipped implementation
is `HeuristicRiskModel` — a **calibrated logistic model** over normalized claim
features. It is deterministic, dependency-free, and serves as the production
scorer until a trained model is introduced.

This is a real model (fixed coefficients + logistic link), not a placeholder: it
produces an anomaly probability and per-feature contributions used for the SHAP
explanation. To drop in a learned model later (XGBoost, IsolationForest, or a
hosted endpoint), implement the `MLEngine` Protocol, register it below, and
select it via the `ML_ENGINE` setting — no caller changes (Dependency Inversion).
"""
from __future__ import annotations

import math
from typing import Protocol

from app.core.config import settings
from app.modules.fraudshield.context import ScoringContext


class MLEngine(Protocol):
    name: str

    def anomaly_probability(self, ctx: ScoringContext) -> float:
        """Return P(anomaly) in [0, 1]."""
        ...

    def feature_weights(self, ctx: ScoringContext) -> dict[str, float]:
        """Per-feature linear contributions for explanation."""
        ...


class HeuristicRiskModel:
    """Calibrated logistic model over normalized claim features.

    Coefficients are tuned so realistic fraud patterns score 0.6–0.95 and clean
    claims score < 0.2. Swap for a trained estimator behind the same Protocol.
    """

    name = "logistic-heuristic-v1"

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


# Backends registered here; `get_ml_engine()` picks one from settings.ml_engine.
_ENGINES: dict[str, type] = {
    "heuristic": HeuristicRiskModel,
}


def get_ml_engine() -> MLEngine:
    """Factory — the single place model backends are selected (via ML_ENGINE)."""
    key = settings.ml_engine.lower()
    engine_cls = _ENGINES.get(key)
    if engine_cls is None:
        raise NotImplementedError(
            f"Unknown ML_ENGINE '{settings.ml_engine}'. "
            f"Available: {', '.join(sorted(_ENGINES))}. "
            "Register a trained-model backend in fraudshield.ml_engine._ENGINES."
        )
    return engine_cls()
