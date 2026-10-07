"""Correctness tests for the SignSight hybrid NIDS.

The expensive behaviours (the actual LODO numbers) are produced by
``python -m model.train``; these tests pin the logic that is cheap to get
silently wrong - the threshold solver's budget arithmetic, the preprocessor's
alignment guarantees, and the alert schema.

    python -m pytest tests/test_model.py -v
"""

from __future__ import annotations

import json

import numpy as np
import pandas as pd
import pytest
from sklearn.metrics import confusion_matrix

from model.config import (
    IsolationForestConfig,
    LightGBMConfig,
    NIDSConfig,
    sanitize_feature_name,
)
from model.data import FlowPreprocessor, attack_family, normalise_labels
from model.pipeline import ALERT_SCHEMA, HybridNIDSModel
from model.thresholds import recall_at_fpr, select_threshold, wilson_upper_bound


# ------------------------------------------------------------ fixtures -----
@pytest.fixture
def toy_flows() -> pd.DataFrame:
    """Small frame with the real CIC header shape, mixed labels, a NaN and an inf."""
    n = 400
    rng = np.random.default_rng(7)
    frame = pd.DataFrame(
        {
            "id": np.arange(n),
            "Flow ID": [f"10.0.0.1-10.0.0.2-{i}-80-6" for i in range(n)],
            "Src IP": rng.choice(["172.16.0.1", "10.5.3.9"], n),
            "Src Port": rng.integers(1024, 65535, n),
            "Dst IP": rng.choice(["172.16.0.2", "192.168.10.4"], n),
            "Dst Port": rng.choice([80, 443, 22, 4444], n),
            "Protocol": rng.choice([6, 17], n),
            "Timestamp": pd.date_range("2017-07-25", periods=n, freq="1s").astype(str),
            "Flow Duration": rng.exponential(1e6, n),
            "Total Fwd Packet": rng.integers(1, 60, n),
            "Total Length of Fwd Packet": rng.integers(0, 5000, n),
            "Flow Bytes/s": rng.gamma(2.0, 500.0, n),
            "Flow Packets/s": rng.gamma(2.0, 5.0, n),
            "Label": ["BENIGN"] * (n - 40) + ["Portscan"] * 40,
        }
    )
    frame.loc[0, "Flow Bytes/s"] = np.inf      # division-by-zero artefact
    frame.loc[1, "Flow Packets/s"] = np.nan    # genuinely missing
    return frame


@pytest.fixture
def toy_model(toy_flows: pd.DataFrame) -> HybridNIDSModel:
    cfg = NIDSConfig(
        stage1=IsolationForestConfig(n_estimators=20),
        stage2=LightGBMConfig(n_estimators=30),
        build_attack_family_head=False,
    )
    return HybridNIDSModel(cfg).fit(toy_flows)


# --------------------------------------------------- threshold solver ------
class TestThresholdSolver:
    def test_respects_fpr_budget(self):
        rng = np.random.default_rng(0)
        n = 200_000
        y = (rng.random(n) < 0.02).astype(int)
        s = np.where(y == 1, rng.beta(6, 2, n), rng.beta(1.5, 12, n))
        op = select_threshold(y, s, max_fpr=0.001)
        tn, fp, fn, tp = confusion_matrix(y, s >= op.threshold, labels=[0, 1]).ravel()
        # Reported counts must be the real counts, not an off-by-one.
        assert (tp, fp, fn, tn) == (op.tp, op.fp, op.fn, op.tn)
        assert op.fpr <= 0.001
        assert op.fpr_upper_bound <= 0.001

    def test_maximises_recall_under_budget(self):
        """Must match an exhaustive scan over every feasible cut."""
        rng = np.random.default_rng(1)
        n = 50_000
        y = (rng.random(n) < 0.05).astype(int)
        s = np.where(y == 1, rng.beta(8, 2, n), rng.beta(1, 8, n))

        order = np.argsort(-s)
        ys = y[order]
        nb = int((ys == 0).sum())
        tp_c = np.cumsum(ys == 1)
        fp_c = np.cumsum(ys == 0)
        ub = wilson_upper_bound(fp_c, nb, 0.95)
        feasible = (ub <= 0.002) & (tp_c + fp_c >= 1)

        op = select_threshold(y, s, max_fpr=0.002)
        assert op.tp == int(tp_c[feasible].max())

    def test_wilson_bound_is_conservative(self):
        point = wilson_upper_bound(10, 10_000)
        assert point > 0.001                      # 10/10000 exactly
        assert 0.0009 < point < 0.002
        # More confidence must widen the interval.
        assert wilson_upper_bound(10, 10_000, 0.99) > point

    def test_single_class_input_rejected(self):
        with pytest.raises(ValueError, match="both classes"):
            select_threshold(np.zeros(50), np.random.rand(50), max_fpr=0.01)
        with pytest.raises(ValueError, match="both classes"):
            select_threshold(np.ones(50), np.random.rand(50), max_fpr=0.01)

    def test_ties_counted_on_the_cut(self):
        """A score exactly equal to the threshold must be alerted (>=)."""
        y = np.array([0, 0, 1, 1])
        s = np.array([0.1, 0.1, 0.5, 0.5])
        op = select_threshold(y, s, max_fpr=1.0)
        assert op.tp == 2 and op.fn == 0

    def test_recall_curve_is_monotonic(self):
        rng = np.random.default_rng(3)
        n = 60_000
        y = (rng.random(n) < 0.03).astype(int)
        s = np.where(y == 1, rng.beta(7, 2, n), rng.beta(1, 9, n))
        recalls = [row["recall"] for row in recall_at_fpr(y, s)]
        assert all(b >= a - 1e-9 for a, b in zip(recalls, recalls[1:]))


# ---------------------------------------------------------- preprocessor ---
class TestPreprocessor:
    def test_feature_names_are_sanitised_and_unique(self):
        pre = FlowPreprocessor().fit(
            pd.DataFrame({"Flow Bytes/s": [1.0], "A B": [2.0]})
        )
        assert pre.feature_names_ == ["flow_bytes_s", "a_b"]

    def test_sanitizer_strips_lightgbm_special_chars(self):
        for raw, expected in [
            ("Flow Bytes/s", "flow_bytes_s"),
            ("  Total Fwd Packet  ", "total_fwd_packet"),
            ("a:b,c[d]", "a_b_c_d"),
        ]:
            assert sanitize_feature_name(raw) == expected

    def test_identifier_and_label_columns_are_dropped(self, toy_flows):
        pre = FlowPreprocessor().fit(toy_flows)
        for leaked in ("id", "flow_id", "src_ip", "dst_ip", "timestamp", "label"):
            assert leaked not in pre.feature_names_

    def test_transform_is_order_independent(self, toy_flows):
        pre = FlowPreprocessor().fit(toy_flows)
        a = pre.transform(toy_flows, impute=True)
        # Reverse the incoming column order; output must be identical.
        b = pre.transform(toy_flows[list(toy_flows.columns)[::-1]], impute=True)
        assert list(a.columns) == list(b.columns)
        np.testing.assert_allclose(a.to_numpy(), b.to_numpy())

    def test_missing_columns_become_nan_not_a_shift(self, toy_flows):
        pre = FlowPreprocessor().fit(toy_flows)
        dropped = toy_flows.drop(columns=["Flow Bytes/s", "Protocol"])
        out = pre.transform(dropped, impute=False)
        assert list(out.columns) == pre.feature_names_
        assert out["flow_bytes_s"].isna().all()
        # Columns that *were* present must still hold their real values.
        np.testing.assert_allclose(
            out["dst_port"].to_numpy(), dropped["Dst Port"].to_numpy(), rtol=1e-6
        )

    def test_imputed_view_has_no_nan_or_inf(self, toy_flows):
        pre = FlowPreprocessor().fit(toy_flows)
        out = pre.transform(toy_flows, impute=True).to_numpy()
        assert np.isfinite(out).all()

    def test_unimputed_view_keeps_nan_for_lightgbm(self, toy_flows):
        pre = FlowPreprocessor().fit(toy_flows)
        assert pre.transform(toy_flows, impute=False).isna().to_numpy().any()

    def test_unseen_subnet_maps_to_minus_one(self, toy_flows):
        pre = FlowPreprocessor().fit(toy_flows)
        novel = toy_flows.head(1).copy()
        novel["Src IP"] = "203.0.113.9"          # never seen at fit time
        assert pre.transform(novel)["src_subnet_id"].iloc[0] == -1


# -------------------------------------------------------------- labelling ---
class TestLabels:
    def test_benign_and_attempted(self):
        s = pd.Series(
            ["BENIGN", "DDoS", "Web Attack - XSS - Attempted", "Portscan"]
        )
        assert normalise_labels(s, include_attempted=True).tolist() == [0, 1, 1, 1]

    def test_attempted_excluded_when_configured(self):
        s = pd.Series(["BENIGN", "Web Attack - XSS - Attempted"])
        assert normalise_labels(s, include_attempted=False).tolist() == [0, 0]

    def test_family_strips_attempted_suffix(self):
        s = pd.Series(["Portscan", "Web Attack - XSS - Attempted", "BENIGN"])
        assert attack_family(s).tolist() == [
            "Portscan", "Web Attack - XSS", "BENIGN"
        ]


# ------------------------------------------------------------- end-to-end ---
class TestModel:
    def test_fit_predict_roundtrip(self, toy_model, toy_flows):
        proba = toy_model.attack_probability(toy_flows)
        assert proba.shape == (len(toy_flows),)
        assert ((proba >= 0) & (proba <= 1)).all()
        assert set(toy_model.predict(toy_flows).tolist()) <= {0, 1}
        assert toy_model.predict_proba(toy_flows).shape == (len(toy_flows), 2)

    def test_benign_and_attack_are_separated(self, toy_model, toy_flows):
        proba = toy_model.attack_probability(toy_flows)
        y = normalise_labels(toy_flows["Label"]).to_numpy()
        assert proba[y == 1].mean() > proba[y == 0].mean()

    def test_probabilities_sum_to_one(self, toy_model, toy_flows):
        np.testing.assert_allclose(toy_model.predict_proba(toy_flows).sum(axis=1), 1.0)

    def test_anomaly_score_is_higher_for_attacks(self, toy_model, toy_flows):
        anom = toy_model.anomaly_score(toy_flows)
        y = normalise_labels(toy_flows["Label"]).to_numpy()
        assert anom[y == 1].mean() > anom[y == 0].mean()

    def test_single_class_training_falls_back(self, toy_flows):
        """Monday is 100% benign, so a LODO fold can train on one class only."""
        benign_only = toy_flows[toy_flows["Label"] == "BENIGN"]
        model = HybridNIDSModel(
            NIDSConfig(build_attack_family_head=False)
        ).fit(benign_only)
        proba = model.attack_probability(benign_only)
        assert proba.shape == (len(benign_only),)
        assert np.isfinite(proba).all()

    def test_missing_label_column_raises(self, toy_flows):
        with pytest.raises(ValueError, match="Label"):
            HybridNIDSModel().fit(toy_flows.drop(columns=["Label"]))

    def test_calibrate_locks_threshold(self, toy_model, toy_flows):
        point = toy_model.calibrate(toy_flows, normalise_labels(toy_flows["Label"]))
        assert toy_model.threshold_ == point.threshold
        assert 0.0 <= toy_model.threshold_ <= 1.0

    def test_set_threshold_validates_range(self, toy_model):
        with pytest.raises(ValueError):
            toy_model.set_threshold(1.5)
        toy_model.set_threshold(0.42)
        assert toy_model.threshold_ == 0.42

    def test_save_load_roundtrip(self, toy_model, toy_flows, tmp_path):
        path = tmp_path / "m.joblib"
        toy_model.save(path)
        reloaded = HybridNIDSModel.load(path)
        np.testing.assert_allclose(
            reloaded.attack_probability(toy_flows),
            toy_model.attack_probability(toy_flows),
        )
        assert reloaded.threshold_ == toy_model.threshold_

    def test_unfitted_model_raises(self):
        with pytest.raises(RuntimeError, match="not fitted"):
            HybridNIDSModel().attack_probability(pd.DataFrame({"a": [1.0]}))

    def test_model_card_is_serialisable(self, toy_model):
        card = toy_model.to_card()
        json.dumps(card, default=str)          # must not raise
        assert card["alert_policy"]["inline_blocking"] is False


# ----------------------------------------------------------- alert schema ---
class TestAlerts:
    def test_alert_shape_and_contract(self, toy_model, toy_flows):
        # Use the model's own calibrated cut rather than a guessed 0.5, so the
        # test asserts the schema rather than the toy model's calibration.
        toy_model.calibrate(toy_flows, normalise_labels(toy_flows["Label"]))
        alerts = toy_model.triage(toy_flows)
        assert alerts, "expected at least one alert"
        for alert in alerts:
            assert alert["schema"] == ALERT_SCHEMA
            assert alert["action"] == "NOTIFY_SOC_ANALYST"
            assert alert["blocking"] is False
            assert alert["severity"] in {"CRITICAL", "HIGH", "MEDIUM"}
            assert alert["verdict"] in {
                "ATTACK", "ATTACK_NOVEL", "NOVEL_SUSPICIOUS"
            }
            assert alert["scores"]["attack_probability"] >= toy_model.threshold_ or (
                alert["detection"]["stage1_outlier"]
            )
            for key in (
                "event_id", "timestamp", "flow",
                "recommended_action", "model",
            ):
                assert key in alert
        json.dumps(alerts, default=str)

    def test_event_ids_are_stable_and_unique(self, toy_model, toy_flows):
        first = toy_model.triage(toy_flows)
        second = toy_model.triage(toy_flows)
        assert [a["event_id"] for a in first] == [a["event_id"] for a in second]
        assert len({a["event_id"] for a in first}) == len(first)

    def test_tolerates_partial_records(self, toy_model, toy_flows):
        assert isinstance(toy_model.triage(toy_flows[["Dst Port", "Flow Duration"]]), list)

    def test_include_benign_emits_records(self, toy_model, toy_flows):
        toy_model.set_threshold(1.0)          # nothing can alert at p >= 1.0
        assert toy_model.triage(toy_flows) == []
        assert len(toy_model.triage(toy_flows, include_benign=True)) == len(toy_flows)