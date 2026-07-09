"""ML scoring adapter.

`MLEngine` is the interface the pipeline depends on. Two backends ship:

* ``TrainedEnsembleModel`` (``ml_trained``) — a **trained** XGBoost +
  IsolationForest ensemble with exact TreeSHAP explanations, produced by
  ``scripts/train_fraud_model.py`` on synthetic data. Selected by ML_ENGINE
  ``trained`` (or ``auto`` when its artifacts are present).
* ``HeuristicRiskModel`` — a dependency-free calibrated logistic model over
  normalized claim features (fixed coefficients + logistic link). The fallback
  when the trained artifacts / ML libraries are unavailable.

The backend is chosen in one place — ``get_ml_engine()`` — via the ``ML_ENGINE``
setting, so callers never change (Dependency Inversion). ``auto`` (the default)
prefers the trained ensemble and degrades gracefully to the heuristic.
"""
from __future__ import annotations

import math
from collections.abc import Callable
from typing import Protocol

import structlog

from app.core.config import settings
from app.modules.fraudshield.context import ScoringContext

logger = structlog.get_logger(__name__)


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


def _make_trained() -> MLEngine:
    from app.modules.fraudshield.ml_trained import get_trained_engine

    return get_trained_engine()


# Backends registered here; `get_ml_engine()` picks one from settings.ml_engine.
# "auto" is resolved in the factory (prefer trained, fall back to heuristic).
_ENGINES: dict[str, Callable[[], MLEngine]] = {
    "heuristic": HeuristicRiskModel,
    "trained": _make_trained,
}


def get_ml_engine() -> MLEngine:
    """Factory — the single place model backends are selected (via ML_ENGINE)."""
    key = settings.ml_engine.lower()

    if key == "auto":
        from app.modules.fraudshield.ml_trained import TrainedEnsembleModel

        if TrainedEnsembleModel.available():
            return _make_trained()
        logger.info("fraudshield.ml_engine.fallback", reason="trained artifacts unavailable")
        return HeuristicRiskModel()

    factory = _ENGINES.get(key)
    if factory is None:
        raise NotImplementedError(
            f"Unknown ML_ENGINE '{settings.ml_engine}'. "
            f"Available: auto, {', '.join(sorted(_ENGINES))}. "
            "Register a trained-model backend in fraudshield.ml_engine._ENGINES."
        )
    return factory()
