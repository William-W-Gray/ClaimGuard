"""FraudShield — explainable claim risk scoring.

Pipeline (adapter chain, ML-swappable):

    ScoringContext
        │
        ▼
    RuleEngine          → deterministic clinical/financial rules + flags
        │
        ▼
    MLEngine (adapter)  → anomaly probability (trained XGBoost + IsolationForest
                          ensemble, or a heuristic fallback — see ml_engine)
        │
        ▼
    ExplanationEngine   → SHAP-style feature contributions + narrative
        │
        ▼
    DecisionEngine      → risk level, decision, priority, SLA
"""
from app.modules.fraudshield.context import ScoringContext, ScoringResult
from app.modules.fraudshield.service import FraudShieldService

__all__ = ["FraudShieldService", "ScoringContext", "ScoringResult"]
