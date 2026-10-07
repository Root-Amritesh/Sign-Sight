"""The two-stage hybrid NIDS: Isolation Forest -> LightGBM.

Stage 1 (unsupervised)
    An :class:`~sklearn.ensemble.IsolationForest` is fitted on *benign flows
    only*.  It learns the shape of routine enterprise traffic and emits a
    continuous anomaly score per flow.  Because it is trained on a single class
    it cannot memorise an attack signature, so it keeps reacting to traffic the
    supervised stage has never seen - the zero-day / evasion path.

Stage 2 (supervised)
    A LightGBM gradient-boosted classifier consumes the raw flow features *plus*
    the stage 1 anomaly score.  For known attacks it learns precise multivariate
    boundaries; for disguised attacks the elevated anomaly score is enough
    evidence to break the benign side of the boundary.

Operating point
    Stage 2 never guesses its own cut-off.  The threshold is solved separately
    against an explicit false-positive budget (see :mod:`model.thresholds`) and
    travels with the artefact, so the deployed model is reproducible and
    auditable.

Design notes worth knowing when reading this file
-------------------------------------------------
* **No feature scaler.**  Both stages are tree ensembles; monotonic transforms
  of the inputs cannot change a single split decision.  A ``RobustScaler`` here
  would be pure overhead and a source of train/serve skew.
* **NaN is preserved for stage 2, imputed for stage 1.**  LightGBM routes NaN
  through its histograms natively; IsolationForest cannot consume it.
* **No ``class_weight='balanced'``.**  Attacks are genuinely rare and that
  scarcity is informative.  Reweighting to a 1:1 ratio inflates every benign
  score, destroys calibration, and leaves the threshold solver nothing to tune.
  Natural priors are kept and recall is bought at the operating point instead.
"""

from __future__ import annotations

import datetime as _dt
import platform
import sys
import zlib
from dataclasses import dataclass
from typing import Any, Mapping

import joblib
import lightgbm
import numpy as np
import pandas as pd
import sklearn
from lightgbm import LGBMClassifier
from sklearn.ensemble import IsolationForest

from .config import NIDSConfig
from .data import FlowPreprocessor, attack_family, normalise_labels
from .thresholds import OperatingPoint, select_threshold

__all__ = ["HybridNIDSModel", "SOCAlert", "ALERT_SCHEMA"]

ALERT_SCHEMA = "signsight.soc-alert/v1"

#: Probability at/above which an already-alerting flow is unambiguous.
_CRITICAL_PROB = 0.90
#: Stage 1 can out-vote stage 2: a flow this anomalous is escalated for review
#: even when stage 2 is lukewarm.  This is the zero-day path made operational.
_NOVELTY_PROB_FLOOR = 0.35


@dataclass
class SOCAlert:
    """One triage record, serialised straight into the SIEM/SOAR pipeline."""

    event_id: str
    timestamp: str
    verdict: str
    severity: str
    action: str
    blocking: bool
    flow: dict[str, Any]
    scores: dict[str, Any]
    detection: dict[str, Any]
    triage: dict[str, Any]
    recommended_action: str
    model: dict[str, Any]

    def to_dict(self) -> dict:
        return {
            "schema": ALERT_SCHEMA,
            "event_id": self.event_id,
            "timestamp": self.timestamp,
            "verdict": self.verdict,
            "severity": self.severity,
            "action": self.action,
            "blocking": self.blocking,
            "flow": self.flow,
            "scores": self.scores,
            "detection": self.detection,
            "triage": self.triage,
            "recommended_action": self.recommended_action,
            "model": self.model,
        }


class _ConstantAttackModel:
    """Stand-in for stage 2 when a training fold contains a single class.

    Satisfies just enough of the ``LGBMClassifier`` surface used downstream
    (``classes_``, ``predict_proba``, ``feature_name_``, ``booster_``) so the
    rest of the pipeline stays identical.  Emits the observed attack rate as a
    constant probability - a neutral, non-invented score.
    """

    classes_ = np.array([0, 1])

    def __init__(self, attack_rate: float = 0.0, feature_names=None) -> None:
        self.attack_rate = float(attack_rate)
        self.feature_name_ = list(feature_names) if feature_names is not None else []
        self.booster_ = _ZeroGainBooster(self.feature_name_)

    def predict_proba(self, x) -> np.ndarray:
        n = len(x)
        p = np.full(n, self.attack_rate, dtype=np.float64)
        return np.column_stack([1.0 - p, p])


class _ZeroGainBooster:
    """Minimal ``booster_`` stand-in: uniform importance over the features."""

    def __init__(self, feature_names: list[str]) -> None:
        self.feature_names = list(feature_names)

    def feature_importance(self, importance_type: str = "gain") -> np.ndarray:
        return np.zeros(len(self.feature_names), dtype=np.float64)


class HybridNIDSModel:
    """Two-stage intrusion detector with an FPR-budgeted operating point."""

    def __init__(self, config: NIDSConfig | None = None) -> None:
        self.cfg = config or NIDSConfig()
        self.pre: FlowPreprocessor | None = None
        self.iso_: IsolationForest | None = None
        self.clf_: LGBMClassifier | None = None
        self.family_clf_: LGBMClassifier | None = None
        self.family_classes_: np.ndarray | None = None

        self.anomaly_feature_ = "iso_anomaly_score"
        self.threshold_: float = 0.5
        self.novelty_cut_: float = float("inf")
        self.operating_point_: OperatingPoint | None = None
        self.training_report_: dict[str, Any] = {}
        self.fitted_at_: str | None = None

    # ------------------------------------------------------------- fit ----
    def fit(
        self,
        df: pd.DataFrame,
        y: np.ndarray | None = None,
        *,
        families: np.ndarray | None = None,
    ) -> "HybridNIDSModel":
        """Train both stages.

        ``df`` is the raw capture (needs a ``Label`` column unless ``y`` is
        given).  Passing ``y`` explicitly lets the cross-validation folds score a
        held-out day without any label leakage into the preprocessor.
        """
        if "Label" not in df.columns and y is None:
            raise ValueError("either a 'Label' column or an explicit y is required")

        if self.pre is None:
            self.pre = FlowPreprocessor().fit(df)

        if y is None:
            y = normalise_labels(
                df["Label"], include_attempted=self.cfg.include_attempted
            ).to_numpy()
        y = np.asarray(y).astype(np.int8)

        benign_mask = y == 0
        if not benign_mask.any():
            raise ValueError("stage 1 requires at least one benign training flow")

        # -- stage 1: benign-only isolation forest -------------------------
        x_stage1 = self.pre.transform(df, impute=True)
        self.iso_ = IsolationForest(
            n_estimators=self.cfg.stage1.n_estimators,
            max_samples=self.cfg.stage1.max_samples,
            contamination=self.cfg.stage1.contamination,
            max_features=self.cfg.stage1.max_features,
            bootstrap=self.cfg.stage1.bootstrap,
            random_state=self.cfg.stage1.random_state,
            n_jobs=self.cfg.stage1.n_jobs,
        )
        self.iso_.fit(x_stage1.to_numpy()[benign_mask])
        del x_stage1

        train_anomaly = self.anomaly_score(df)
        # Novelty cut = the contamination quantile of *benign* training scores.
        self.novelty_cut_ = float(
            np.quantile(train_anomaly[benign_mask], 1.0 - self.cfg.stage1.contamination)
        )

        # -- stage 2: LightGBM over flows + anomaly ------------------------
        x_stage2 = self._augment(train_anomaly, precomputed=df)
        n_flow_features = x_stage2.shape[1] - 1
        if len(np.unique(y)) < 2:
            # Degenerate training fold (e.g. Monday is 100% benign, so a LODO
            # fold holding Tuesday out trains on benign traffic alone). A
            # classifier cannot be fitted, so fall back to a constant scorer.
            # Nothing is learned and nothing is claimed - the caller's metrics
            # for that fold are explicitly marked single-class.
            self.clf_ = _ConstantAttackModel(
                attack_rate=float(y.mean()), feature_names=list(x_stage2.columns)
            )
        else:
            self.clf_ = LGBMClassifier(objective="binary", **self.cfg.stage2.as_params())
            self.clf_.fit(x_stage2, y)
        del x_stage2

        # -- optional triage head: which family? ---------------------------
        if self.cfg.build_attack_family_head:
            self._fit_family_head(df, y, train_anomaly, families)

        self.fitted_at_ = _dt.datetime.now(_dt.timezone.utc).isoformat()
        self.training_report_ = {
            "n_train_flows": int(len(y)),
            "n_train_benign": int(benign_mask.sum()),
            "n_train_attack": int((~benign_mask).sum()),
            "n_flow_features": int(n_flow_features),
            "n_features_total": int(n_flow_features + 1),
            "anomaly_feature": self.anomaly_feature_,
            "novelty_cut": self.novelty_cut_,
            "attack_families": (
                [str(c) for c in self.family_classes_]
                if self.family_classes_ is not None
                else []
            ),
        }
        return self

    def _fit_family_head(
        self,
        df: pd.DataFrame,
        y: np.ndarray,
        anomaly: np.ndarray,
        families: np.ndarray | None,
    ) -> None:
        """Multiclass booster trained on attack flows only.

        The SOC question is never only "is this bad?" - it is "what is it?".
        Restricting the fit to the attack class stops the family decision from
        being drowned out by hundreds of thousands of benign rows.
        """
        attack_mask = y != 0
        if int(attack_mask.sum()) < 50:
            return
        fam = (
            np.asarray(families)
            if families is not None
            else attack_family(df["Label"], self.cfg.include_attempted).to_numpy()
        )
        present, counts = np.unique(fam[attack_mask], return_counts=True)
        # Singletons cannot be learned and would only add a useless class.
        keep = present[counts >= 20]
        if len(keep) < 2:
            return
        keep_mask = attack_mask & np.isin(fam, keep)
        self.family_clf_ = LGBMClassifier(
            objective="multiclass",
            n_estimators=max(200, self.cfg.stage2.n_estimators // 3),
            learning_rate=self.cfg.stage2.learning_rate,
            num_leaves=31,
            subsample=self.cfg.stage2.subsample,
            subsample_freq=self.cfg.stage2.subsample_freq,
            colsample_bytree=self.cfg.stage2.colsample_bytree,
            reg_lambda=self.cfg.stage2.reg_lambda,
            random_state=self.cfg.stage2.random_state,
            n_jobs=self.cfg.stage2.n_jobs,
            verbosity=self.cfg.stage2.verbosity,
            num_class=len(keep),
        )
        self.family_clf_.fit(self._augment(anomaly, precomputed=df)[keep_mask], fam[keep_mask].astype(str))
        self.family_classes_ = np.asarray(self.family_clf_.classes_, dtype=object)

    # ---------------------------------------------------------- scoring ----
    def _require(self) -> None:
        if self.pre is None or self.iso_ is None or self.clf_ is None:
            raise RuntimeError("model is not fitted - call fit() or load() first")

    def anomaly_score(self, df: pd.DataFrame) -> np.ndarray:
        """Stage 1 output only: higher == structurally unlike the benign baseline.

        ``-score_samples`` inverts sklearn's convention (where higher means
        *more normal*), so this runs from ~0 (dead centre of normal traffic)
        upward as a flow approaches the sparse fringe of feature space.
        """
        if self.pre is None or self.iso_ is None:
            raise RuntimeError("stage 1 is not fitted")
        x = self.pre.transform(df, impute=True)
        return -self.iso_.score_samples(x.to_numpy())

    def _augment(
        self, anomaly: np.ndarray, *, precomputed: pd.DataFrame | None = None
    ) -> pd.DataFrame:
        """Attach the stage 1 score as one extra column of the flow matrix.

        NaNs are deliberately left in place here - LightGBM handles them
        natively and the missingness itself carries signal.
        """
        x = self.pre.transform(precomputed, impute=False)
        x[self.anomaly_feature_] = np.asarray(anomaly, dtype=np.float32)
        return x

    def attack_probability(self, df: pd.DataFrame) -> np.ndarray:
        """Stage 2 output only: calibrated ``P(attack)``."""
        return self.score_frame(df)[0]

    def score_frame(self, df: pd.DataFrame) -> tuple[np.ndarray, np.ndarray]:
        """One pass -> ``(attack_probability, anomaly_score)``.

        Both stages are evaluated exactly once; scoring a frame three times
        (prob / anomaly / family) would triple the cost of the largest
        operation in the pipeline.
        """
        self._require()
        anomaly = self.anomaly_score(df)
        x = self._augment(anomaly, precomputed=df)
        proba = self.clf_.predict_proba(x)
        return proba[:, list(self.clf_.classes_).index(1)], anomaly

    def predict_proba(self, df: pd.DataFrame) -> np.ndarray:
        """``(n, 2)`` array ordered ``[BENIGN, ATTACK]``."""
        self._require()
        return self.clf_.predict_proba(self._augment(self.anomaly_score(df), precomputed=df))

    def predict(self, df: pd.DataFrame) -> np.ndarray:
        """Binary decisions at the FPR-budgeted operating point."""
        return (self.attack_probability(df) >= self.threshold_).astype(np.int8)

    def predict_family(self, df: pd.DataFrame) -> tuple[np.ndarray, np.ndarray]:
        """Family name + confidence per flow (empty strings when untrained)."""
        n = len(df)
        if self.family_clf_ is None or self.family_classes_ is None:
            return np.array([""] * n, dtype=object), np.zeros(n, dtype=np.float64)
        proba = self.family_clf_.predict_proba(
            self._augment(self.anomaly_score(df), precomputed=df)
        )
        idx = proba.argmax(axis=1)
        return np.asarray(self.family_classes_, dtype=object)[idx], proba[
            np.arange(n), idx
        ]

    # ------------------------------------------------------ calibration ----
    def calibrate(
        self,
        df: pd.DataFrame,
        y: np.ndarray,
        *,
        max_fpr: float | None = None,
        confidence: float | None = None,
    ) -> OperatingPoint:
        """Solve the alert threshold against the FPR budget and lock it in.

        Feed this predictions from flows the model has *not* trained on; the
        offline pipeline uses pooled out-of-fold scores.
        """
        max_fpr = self.cfg.max_fpr if max_fpr is None else max_fpr
        confidence = self.cfg.fpr_confidence if confidence is None else confidence
        point = select_threshold(
            np.asarray(y), self.attack_probability(df),
            max_fpr=max_fpr, confidence=confidence,
        )
        self.operating_point_ = point
        self.threshold_ = point.threshold
        return point

    def set_threshold(self, threshold: float) -> None:
        """Override the alert cut (e.g. per-site tuning in the SOC)."""
        if not 0.0 <= float(threshold) <= 1.0:
            raise ValueError("threshold must be a probability in [0, 1]")
        self.threshold_ = float(threshold)

    # ----------------------------------------------------------- triage ----
    def triage(self, df: pd.DataFrame, *, include_benign: bool = False) -> list[dict]:
        """Score flows and emit contextual SOC alerts. Never blocks inline.

        A flow is escalated when stage 2 clears the operating threshold, *or*
        when stage 1 flags it as structurally novel and stage 2 is at least
        lukewarm - the latter is precisely the zero-day case the two-stage
        design exists to catch.
        """
        self._require()
        df = df.reset_index(drop=True)
        proba, anomaly = self.score_frame(df)
        meta = self.pre.flow_metadata(df)
        alert_mask = (proba >= self.threshold_) | (
            (anomaly > self.novelty_cut_) & (proba >= _NOVELTY_PROB_FLOOR)
        )
        idx = np.flatnonzero(alert_mask if not include_benign else np.ones(len(df), bool))

        # Family lookup only for rows that actually became alerts, and in one
        # batched pass rather than per row.
        families: np.ndarray = np.array([""] * len(idx), dtype=object)
        confs: np.ndarray = np.zeros(len(idx))
        if self.family_clf_ is not None and len(idx):
            names, conf = self.predict_family(df.iloc[idx])
            families, confs = names, conf

        alerts: list[dict] = []
        for slot, i in enumerate(idx):
            alerts.append(
                self._build_alert(
                    prob=float(proba[i]),
                    anomaly=float(anomaly[i]),
                    novel=bool(anomaly[i] > self.novelty_cut_),
                    family=(str(families[slot]), float(confs[slot])),
                    meta_row=meta.iloc[i].to_dict(),
                    position=int(i),
                )
            )
        return alerts

    def _build_alert(
        self,
        *,
        prob: float,
        anomaly: float,
        novel: bool,
        family: tuple[str, float],
        meta_row: Mapping[str, Any],
        position: int,
    ) -> dict:
        alerting = prob >= self.threshold_
        if alerting and novel:
            # Classified *and* outside the benign envelope: the detection does
            # not depend on having seen this attack's signature before.
            verdict, severity = "ATTACK_NOVEL", "CRITICAL"
        elif alerting and prob >= _CRITICAL_PROB:
            verdict, severity = "ATTACK", "CRITICAL"
        elif alerting:
            verdict, severity = "ATTACK", "HIGH"
        else:
            verdict, severity = "NOVEL_SUSPICIOUS", "MEDIUM"

        recommended = {
            "CRITICAL": "Page on-call; isolate the source host pending confirmation.",
            "HIGH": "Queue for analyst review within the current shift.",
            "MEDIUM": "Correlate with endpoint and auth telemetry; do not page.",
        }[severity]

        flow_id = str(meta_row.get("Flow ID") or f"row-{position}")
        # crc32 (not hash()) so alert IDs are stable across processes - Python
        # salts string hashing per interpreter and would re-key every alert.
        event_id = f"IDS-ML-{zlib.crc32(flow_id.encode('utf-8')) % 10**10:010d}"
        return SOCAlert(
            event_id=event_id,
            timestamp=_dt.datetime.now(_dt.timezone.utc).isoformat(),
            verdict=verdict,
            severity=severity,
            # An ML score is never sufficient on its own for an inline drop, so
            # the pipeline is advisory by construction.
            action="NOTIFY_SOC_ANALYST",
            blocking=False,
            flow={
                "flow_id": flow_id,
                "src_ip": meta_row.get("Src IP"),
                "src_port": meta_row.get("Src Port"),
                "dst_ip": meta_row.get("Dst IP"),
                "dst_port": meta_row.get("Dst Port"),
                "protocol": meta_row.get("Protocol"),
                "timestamp": meta_row.get("Timestamp"),
            },
            scores={
                "attack_probability": round(prob, 6),
                "stage1_anomaly_score": round(anomaly, 6),
                "stage1_novelty_cut": round(self.novelty_cut_, 6),
                "alert_threshold": round(self.threshold_, 6),
            },
            detection={
                "stage1_outlier": novel,
                "stage2_alert": alerting,
                "signature_independent": novel,
            },
            triage={
                "predicted_family": family[0] or None,
                "family_confidence": round(family[1], 6),
                "true_label": meta_row.get("Label"),
            },
            recommended_action=recommended,
            model={
                "name": self.cfg.model_name,
                "version": self.cfg.version,
                "trained_at": self.fitted_at_,
                "architecture": "IsolationForest -> LightGBM",
            },
        ).to_dict()

    # ------------------------------------------------------ persistence ----
    def save(self, path) -> None:
        joblib.dump(
            {
                "model": self,
                "format_version": 1,
                "python": sys.version.split()[0],
                "platform": platform.platform(),
                "sklearn": sklearn.__version__,
                "lightgbm": lightgbm.__version__,
            },
            path,
            compress=3,
        )

    @classmethod
    def load(cls, path) -> "HybridNIDSModel":
        payload = joblib.load(path)
        model = payload["model"] if isinstance(payload, dict) else payload
        if not isinstance(model, cls):
            raise TypeError(f"artefact does not contain a {cls.__name__}")
        return model

    # ------------------------------------------------------------ info ----
    def feature_importance(self, top: int = 25) -> pd.DataFrame:
        """Stage 2 gain share, with stage 1's contribution flagged."""
        self._require()
        imp = pd.DataFrame(
            {
                "feature": list(self.clf_.feature_name_),
                "gain": self.clf_.booster_.feature_importance(importance_type="gain"),
                "splits": self.clf_.booster_.feature_importance(importance_type="split"),
            }
        )
        total = imp["gain"].sum()
        imp["gain_share"] = imp["gain"] / total if total else 0.0
        imp["stage"] = np.where(imp["feature"] == self.anomaly_feature_, "stage1", "flow")
        return imp.sort_values("gain_share", ascending=False).head(top).reset_index(drop=True)

    def summary(self) -> str:
        self._require()
        rep = self.training_report_
        lines = [
            f"{self.cfg.model_name} v{self.cfg.version} - two-stage hybrid NIDS",
            f"  stage 1 : IsolationForest(n_estimators="
            f"{self.cfg.stage1.n_estimators}) on {rep.get('n_train_benign', 0):,} benign flows",
            f"  stage 2 : LightGBM(n_estimators={self.cfg.stage2.n_estimators},"
            f" lr={self.cfg.stage2.learning_rate}) on {rep.get('n_features_total', 0)}"
            f" features ({rep.get('n_train_flows', 0):,} flows)",
            f"  threshold: {self.threshold_:.6f}   novelty cut: {self.novelty_cut_:.6f}",
        ]
        if self.operating_point_:
            op = self.operating_point_
            lines += [
                f"  FPR      : {op.fpr:.5%} observed / {op.fpr_upper_bound:.5%} 95% UB"
                f"  (budget {self.cfg.max_fpr:.3%})",
                f"  recall   : {op.recall:.4%}   precision: {op.precision:.4%}"
                f"   {op.alerts_per_10k_flows:.1f} alerts / 10k flows",
            ]
        return "\n".join(lines)

    def to_card(self) -> dict:
        """Machine-readable model card shipped beside the artefact."""
        return {
            "name": self.cfg.model_name,
            "version": self.cfg.version,
            "fitted_at": self.fitted_at_,
            "architecture": {
                "stage_1": {
                    "model": "sklearn.ensemble.IsolationForest",
                    "trained_on": "benign flows only",
                    "params": dict(self.cfg.stage1.__dict__),
                    "output": "anomaly score, higher = further from the benign envelope",
                    "novelty_cut": self.novelty_cut_,
                },
                "stage_2": {
                    "model": "lightgbm.LGBMClassifier",
                    "objective": "binary",
                    "params": self.cfg.stage2.as_params(),
                    "inputs": [
                        *(self.pre.feature_names_ if self.pre else []),
                        self.anomaly_feature_,
                    ],
                },
                "operating_point": (
                    self.operating_point_.to_dict() if self.operating_point_ else None
                ),
            },
            "alert_policy": {
                "action": "NOTIFY_SOC_ANALYST",
                "inline_blocking": False,
                "critical_probability": _CRITICAL_PROB,
                "novelty_probability_floor": _NOVELTY_PROB_FLOOR,
                "rationale": "ML confidence alone must never trigger an inline drop.",
            },
            "training": self.training_report_,
            "top_features": self.feature_importance(top=20).to_dict(orient="records"),
            "environment": {
                "python": sys.version.split()[0],
                "sklearn": sklearn.__version__,
                "lightgbm": lightgbm.__version__,
                "numpy": np.__version__,
                "pandas": pd.__version__,
            },
            "config": self.cfg.to_dict(),
        }