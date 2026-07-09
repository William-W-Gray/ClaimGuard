"""Tests for the trained FraudShield ensemble (XGBoost + IsolationForest).

Skipped automatically when the trained artifacts or ML libraries are absent, so
the suite still passes in a minimal environment (the heuristic backend covers
the pipeline tests in test_fraudshield.py).
"""
from __future__ import annotations

import pytest

from app.modules.fraudshield import ScoringContext
from app.modules.fraudshield.features import FEATURE_NAMES
from app.modules.fraudshield.ml_trained import TrainedEnsembleModel
from app.modules.fraudshield.service import FraudShieldService

pytestmark = pytest.mark.skipif(
    not TrainedEnsembleModel.available(),
    reason="trained FraudShield artifacts not present (run scripts/train_fraud_model.py)",
)


def _clean_ctx() -> ScoringContext:
    return ScoringContext(
        claim_ref="CLEAN",
        claimed_amount=22.0,
        member_shortfall=8.0,
        expected_shortfall_min=7,
        expected_shortfall_max=12,
        provider_trust_score=97,
        provider_flags_90d=0,
        has_biometric=True,
    )


def _fraud_ctx() -> ScoringContext:
    return ScoringContext(
        claim_ref="FRAUD",
        claimed_amount=280.0,
        member_shortfall=95.0,
        expected_shortfall_min=30,
        expected_shortfall_max=50,
        provider_trust_score=38,
        provider_flags_90d=31,
        prescription_after_service=True,
        chronic_drug_no_condition=True,
        has_biometric=False,
        syndicate_signal=True,
    )


def test_trained_model_loads_and_identifies():
    model = TrainedEnsembleModel()
    assert "synthetic" in model.name


def test_anomaly_probability_bounds_and_separation():
    model = TrainedEnsembleModel()
    clean = model.anomaly_probability(_clean_ctx())
    fraud = model.anomaly_probability(_fraud_ctx())
    assert 0.0 <= clean <= 1.0
    assert 0.0 <= fraud <= 1.0
    # The trained model must rank an obvious fraud well above a clean claim.
    assert fraud > clean + 0.3


def test_feature_weights_are_exact_treeshap_over_all_features():
    model = TrainedEnsembleModel()
    weights = model.feature_weights(_fraud_ctx())
    assert set(weights) == set(FEATURE_NAMES)
    assert any(abs(v) > 1e-6 for v in weights.values())


def test_pipeline_with_trained_engine_scores_and_explains():
    service = FraudShieldService(ml_engine=TrainedEnsembleModel())
    result = service.score(_fraud_ctx())
    assert result.model_name.startswith("fraudshield-ensemble")
    assert result.risk_score >= 80
    assert result.decision == "PEND_INVESTIGATE"
    assert result.shap
    # Contributions are normalized shares → each within [-1, 1].
    assert all(-1.0 <= s.contribution <= 1.0 for s in result.shap)


def test_inference_latency_under_target():
    service = FraudShieldService(ml_engine=TrainedEnsembleModel())
    result = service.score(_fraud_ctx())
    assert result.latency_ms < 500
