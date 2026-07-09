"""Canonical feature extraction for the FraudShield ML models.

This is the single source of truth for the numeric feature vector fed to the
trained estimators (XGBoost + IsolationForest). Training (`scripts/
train_fraud_model.py`) and inference (`ml_trained.TrainedEnsembleModel`) both
import from here so the two can never drift — the #1 cause of train/serve skew.

Feature order is significant: the persisted models expect columns in exactly
`FEATURE_NAMES` order. Append new features to the END and retrain; never reorder.
"""
from __future__ import annotations

from app.modules.fraudshield.context import ScoringContext

# Ordered feature columns. The trained model artifacts are bound to this order.
FEATURE_NAMES: list[str] = [
    "shortfall_ratio",
    "claimed_amount",
    "provider_flags_90d",
    "low_trust",
    "no_biometric",
    "prescription_after_service",
    "chronic_drug_no_condition",
    "syndicate_signal",
    "num_conditions",
    "num_items",
]

# Human-readable labels for the SHAP explanation (keyed by feature name).
FEATURE_LABELS: dict[str, str] = {
    "shortfall_ratio": "Member shortfall vs expected",
    "claimed_amount": "Claim amount",
    "provider_flags_90d": "Provider flag history (90d)",
    "low_trust": "Provider trust deficit",
    "no_biometric": "Missing biometric verification",
    "prescription_after_service": "Prescription dated after service",
    "chronic_drug_no_condition": "Chronic drug, no registered condition",
    "syndicate_signal": "Syndicate pattern match",
    "num_conditions": "Registered conditions",
    "num_items": "Claim line-item count",
}


def feature_dict(ctx: ScoringContext) -> dict[str, float]:
    """Map a scoring context to its named numeric features."""
    return {
        "shortfall_ratio": float(ctx.shortfall_ratio),
        "claimed_amount": float(ctx.claimed_amount),
        "provider_flags_90d": float(ctx.provider_flags_90d),
        "low_trust": float(max(0, 100 - ctx.provider_trust_score)),
        "no_biometric": 0.0 if ctx.has_biometric else 1.0,
        "prescription_after_service": 1.0 if ctx.prescription_after_service else 0.0,
        "chronic_drug_no_condition": 1.0 if ctx.chronic_drug_no_condition else 0.0,
        "syndicate_signal": 1.0 if ctx.syndicate_signal else 0.0,
        "num_conditions": float(len(ctx.member_conditions)),
        "num_items": float(len(ctx.item_descriptions)),
    }


def feature_row(ctx: ScoringContext) -> list[float]:
    """Feature vector in `FEATURE_NAMES` order (model input row)."""
    feats = feature_dict(ctx)
    return [feats[name] for name in FEATURE_NAMES]
