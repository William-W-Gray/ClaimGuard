"""Trained ML backend — XGBoost + IsolationForest ensemble with exact TreeSHAP.

Implements the `MLEngine` Protocol so it drops into the FraudShield pipeline with
no caller changes. Produced by `scripts/train_fraud_model.py` (synthetic data —
see that module's warning). Loaded lazily and cached; if the artifacts or the ML
libraries are missing, `TrainedEnsembleModel.available()` returns False so the
factory can fall back to the dependency-free heuristic model.

`feature_weights()` returns **exact SHAP values** from XGBoost's native TreeSHAP
(`pred_contribs=True`) — not an approximation — scaled into the same points-like
range as the rule contributions so the merged explanation is coherent.
"""
from __future__ import annotations

import json
import math
from functools import lru_cache
from pathlib import Path

from app.core.config import settings
from app.modules.fraudshield.context import ScoringContext
from app.modules.fraudshield.features import FEATURE_NAMES, feature_row

_DEFAULT_ARTIFACTS_DIR = Path(__file__).resolve().parent / "artifacts"


def _artifacts_dir() -> Path:
    return Path(settings.ml_artifacts_dir) if settings.ml_artifacts_dir else _DEFAULT_ARTIFACTS_DIR


def _artifacts_present() -> bool:
    d = _artifacts_dir()
    return all((d / f).exists() for f in ("xgb.json", "iforest.joblib", "metadata.json"))


def _libs_present() -> bool:
    try:
        import joblib  # noqa: F401
        import xgboost  # noqa: F401
        return True
    except ImportError:
        return False


def _sigmoid(x: float) -> float:
    return 1.0 / (1.0 + math.exp(-max(min(x, 60.0), -60.0)))


class TrainedEnsembleModel:
    """XGBoost (70%) + IsolationForest (30%) ensemble scorer."""

    def __init__(self) -> None:
        import joblib
        import xgboost as xgb

        d = _artifacts_dir()
        self._meta = json.loads((d / "metadata.json").read_text())
        if self._meta.get("feature_names") != FEATURE_NAMES:
            raise RuntimeError(
                "FraudShield model artifacts are stale: feature order does not match "
                "features.FEATURE_NAMES. Retrain with scripts/train_fraud_model.py."
            )
        self._booster = xgb.Booster()
        self._booster.load_model(d / "xgb.json")
        self._iforest = joblib.load(d / "iforest.joblib")
        w = self._meta["ensemble_weights"]
        self._w_xgb = float(w["xgboost"])
        self._w_if = float(w["isolation_forest"])
        self._if_mean = float(self._meta["iforest_decision_mean"])
        self._if_std = float(self._meta["iforest_decision_std"]) or 1.0
        self._shap_scale = float(self._meta.get("shap_margin_scale", 10.0))
        self.name = self._meta.get("model_version", "fraudshield-ensemble")

    @staticmethod
    def available() -> bool:
        """True only if this backend can actually be constructed."""
        return _libs_present() and _artifacts_present()

    def _dmatrix(self, ctx: ScoringContext):
        import xgboost as xgb

        return xgb.DMatrix([feature_row(ctx)], feature_names=FEATURE_NAMES)

    def anomaly_probability(self, ctx: ScoringContext) -> float:
        row = [feature_row(ctx)]
        xgb_prob = float(self._booster.predict(self._dmatrix(ctx))[0])
        df = float(self._iforest.decision_function(row)[0])  # higher = more normal
        if_anomaly = _sigmoid((self._if_mean - df) / self._if_std)
        prob = self._w_xgb * xgb_prob + self._w_if * if_anomaly
        return float(min(max(prob, 0.0), 1.0))

    def feature_weights(self, ctx: ScoringContext) -> dict[str, float]:
        # pred_contribs → exact TreeSHAP; last column is the bias term (dropped).
        contribs = self._booster.predict(self._dmatrix(ctx), pred_contribs=True)[0]
        return {
            name: round(float(contribs[i]) * self._shap_scale, 4)
            for i, name in enumerate(FEATURE_NAMES)
        }


@lru_cache(maxsize=1)
def get_trained_engine() -> TrainedEnsembleModel:
    """Construct (once) and cache the trained ensemble."""
    return TrainedEnsembleModel()
