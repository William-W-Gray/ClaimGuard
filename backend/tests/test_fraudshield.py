"""Unit tests for the FraudShield scoring pipeline (no DB)."""
from __future__ import annotations

import pytest

from app.modules.fraudshield import ScoringContext
from app.modules.fraudshield.decision_engine import DecisionEngine
from app.modules.fraudshield.ml_engine import HeuristicRiskModel, get_ml_engine
from app.modules.fraudshield.service import FraudShieldService
from app.modules.trustscore.service import TrustInputs, trustscore_service

# Pin these pipeline/rule tests to the deterministic heuristic backend so they
# assert rule + decision logic independently of whichever ML backend is configured
# (the trained ensemble is covered separately in test_fraudshield_ml.py).
service = FraudShieldService(ml_engine=HeuristicRiskModel())


def test_clean_claim_is_low_risk_and_approved():
    ctx = ScoringContext(
        claim_ref="CLEAN",
        claimed_amount=22.0,
        member_shortfall=8.0,
        expected_shortfall_min=7,
        expected_shortfall_max=12,
        provider_trust_score=97,
        provider_flags_90d=0,
        has_biometric=True,
    )
    result = service.score(ctx)
    assert result.risk_level == "LOW"
    assert result.decision == "APPROVE"
    assert result.flags == []


def test_ghost_prescription_is_high_risk_and_investigated():
    ctx = ScoringContext(
        claim_ref="GHOST",
        claimed_amount=88.0,
        member_shortfall=22.0,
        expected_shortfall_min=12,
        expected_shortfall_max=18,
        provider_trust_score=81,
        provider_flags_90d=14,
        prescription_after_service=True,
        chronic_drug_no_condition=True,
        has_biometric=False,
    )
    result = service.score(ctx)
    assert result.risk_score >= 50
    assert result.decision in {"PEND_VERIFY", "PEND_INVESTIGATE"}
    codes = {f.code for f in result.flags}
    assert "PRESCRIPTION_DATE_AFTER_SERVICE" in codes
    assert "CHRONIC_DRUG_NO_CONDITION_REGISTERED" in codes


def test_syndicate_signal_drives_critical_priority():
    ctx = ScoringContext(
        claim_ref="SYND",
        claimed_amount=180.0,
        member_shortfall=85.0,
        expected_shortfall_min=30,
        expected_shortfall_max=50,
        provider_trust_score=44,
        provider_flags_90d=31,
        has_biometric=False,
        syndicate_signal=True,
    )
    result = service.score(ctx)
    assert result.priority == "CRITICAL"
    assert result.risk_score >= 80


def test_explanation_is_generated():
    ctx = ScoringContext(
        claim_ref="EXPLAIN",
        claimed_amount=45.0,
        member_shortfall=25.0,
        expected_shortfall_min=8,
        expected_shortfall_max=12,
        provider_trust_score=73,
        provider_flags_90d=7,
    )
    result = service.score(ctx)
    assert "EXPLAIN" in result.explanation
    assert len(result.shap) > 0


def test_decision_thresholds():
    d = DecisionEngine()
    assert d.decision(10) == "APPROVE"
    assert d.decision(40) == "PEND_VERIFY"
    assert d.decision(85) == "PEND_INVESTIGATE"
    assert d.risk_level(90) == "CRITICAL"


def test_result_carries_model_identity():
    ctx = ScoringContext(
        claim_ref="MODEL",
        claimed_amount=45.0,
        member_shortfall=25.0,
        expected_shortfall_min=8,
        expected_shortfall_max=12,
        provider_trust_score=73,
        provider_flags_90d=7,
    )
    result = service.score(ctx)
    assert result.model_name == "logistic-heuristic-v1"
    assert 0.0 <= result.anomaly_probability <= 1.0


def test_ml_engine_factory_selects_heuristic(monkeypatch):
    from app.core.config import settings

    monkeypatch.setattr(settings, "ml_engine", "heuristic")
    assert isinstance(get_ml_engine(), HeuristicRiskModel)


def test_ml_engine_factory_rejects_unknown(monkeypatch):
    from app.core.config import settings

    monkeypatch.setattr(settings, "ml_engine", "xgboost-not-wired")
    with pytest.raises(NotImplementedError):
        get_ml_engine()


def test_trustscore_badges():
    assert trustscore_service.badge_for(95) == "VERIFIED"
    assert trustscore_service.badge_for(75) == "STANDARD"
    assert trustscore_service.badge_for(55) == "CAUTION"
    score = trustscore_service.compute(
        TrustInputs(dispute_rate=14.7, shortfall_index=3.21, flags_90d=31, total_claims=398)
    )
    assert score < 50
