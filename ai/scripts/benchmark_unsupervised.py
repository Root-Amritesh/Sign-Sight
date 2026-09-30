"""Stage 1 shoot-out: does Isolation Forest earn its slot?

Fits several unsupervised outlier detectors on the *same* benign-only slice,
scores the *same* held-out day, and reports how each separates that day's
attacks from its benign traffic. Identical inputs and identical training rows,
so the comparison isolates the algorithm.

    python -m scripts.benchmark_unsupervised              # thu fold (hardest)
    python -m scripts.benchmark_unsupervised --day fri
    python -m scripts.benchmark_unsupervised --all

Read the per-family columns, not the pooled AUC. The pooled number is propped
up by easy volumetric families; the interesting question is whether a detector
can see the low-and-slow families that stage 2 has never been taught.
"""

from __future__ import annotations

import argparse
import time

import numpy as np
from sklearn.covariance import EllipticEnvelope
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from sklearn.metrics import roc_auc_score
from sklearn.neighbors import LocalOutlierFactor
from sklearn.svm import OneClassSVM

from model.config import ALL_DAYS, NIDSConfig
from model.data import DAY_COLUMN, FlowPreprocessor, load_days, normalise_labels


# Detectors that are quadratic/non-scalable get a row cap so the sweep finishes.
# The cap is a *generosity* to the alternative, not a handicap - these methods
# are being given the best chance, and we note that they cannot use all the data.
DETECTOR_ROW_CAP = {
    "OneClassSVM": 15_000,
    "LOF": 40_000,
    "EllipticEnvelope": 60_000,
}


def auc_vs_benign(score: np.ndarray, attack: np.ndarray, benign: np.ndarray) -> float:
    """AUC of ``score`` for one family against that day's benign traffic.

    Per-family rather than pooled: a single hard family can be invisible in a
    pooled number that is carried by easy volumetric attacks.
    """
    y = np.zeros(len(score), dtype=int)
    y[attack] = 1
    sub = attack | benign
    if y[sub].sum() == 0 or y[sub].sum() == sub.sum():
        return float("nan")
    return float(roc_auc_score(y[sub], score[sub]))


def synth_outliers(x_benign: np.ndarray, n: int, rng) -> np.ndarray:
    """Uniform synthetic outliers - the standard way to give a Random Forest
    something to discriminate against in an unsupervised setting."""
    lo = np.nanmin(x_benign, axis=0)
    hi = np.nanmax(x_benign, axis=0)
    lo = np.where(np.isfinite(lo), lo, 0.0)
    hi = np.where(np.isfinite(hi), hi, 1.0)
    return rng.uniform(lo, hi, size=(n, x_benign.shape[1])).astype(np.float32)


def fit_detector(name: str, x_benign: np.ndarray, cfg: NIDSConfig, rng):
    """Fit one detector and return a callable scoring rows as 'more anomalous'."""
    if name == "IsolationForest(ours)":
        det = IsolationForest(
            n_estimators=cfg.stage1.n_estimators,
            max_samples=cfg.stage1.max_samples,
            contamination=cfg.stage1.contamination,
            random_state=cfg.random_state,
            n_jobs=-1,
        ).fit(x_benign)
        return lambda x: -det.score_samples(x)

    if name == "RandomForest(synth)":
        x_out = synth_outliers(x_benign, len(x_benign), rng)
        xs = np.vstack([x_benign, x_out])
        ys = np.r_[np.zeros(len(x_benign)), np.ones(len(x_out))]
        det = RandomForestClassifier(
            n_estimators=200, random_state=cfg.random_state, n_jobs=-1
        ).fit(xs, ys)
        return lambda x: det.predict_proba(x)[:, 1]

    if name == "OneClassSVM":
        det = OneClassSVM(nu=0.05, kernel="rbf", gamma="scale").fit(x_benign)
        return lambda x: -det.decision_function(x)

    if name == "EllipticEnvelope":
        det = EllipticEnvelope(
            contamination=cfg.stage1.contamination, random_state=cfg.random_state
        ).fit(x_benign)
        return lambda x: -det.score_samples(x)

    if name == "LOF":
        det = LocalOutlierFactor(
            n_neighbors=20, n_jobs=-1, novelty=True
        ).fit(x_benign)
        return lambda x: -det.score_samples(x)

    raise KeyError(name)


DETECTORS = [
    "IsolationForest(ours)",
    "RandomForest(synth)",
    "OneClassSVM",
    "EllipticEnvelope",
    "LOF",
]


def evaluate_day(
    frame, y, x_np, day: str, cfg: NIDSConfig, rng, test_sample: int
) -> dict:
    is_te = (frame[DAY_COLUMN] == day).to_numpy()
    te_idx = np.flatnonzero(is_te)
    labels_all = frame["Label"].astype(str).str.strip().to_numpy()

    # Preserve the attack/benign mix rather than sampling blindly.
    if len(te_idx) > test_sample:
        pos = te_idx[y[te_idx] == 1]
        neg = te_idx[y[te_idx] == 0]
        n_pos = min(len(pos), test_sample // 2)
        pos = rng.choice(pos, n_pos, replace=False)
        neg = rng.choice(neg, min(len(neg), test_sample - n_pos), replace=False)
        te_idx = np.concatenate([pos, neg])

    x_te, y_te = x_np[te_idx], y[te_idx]
    labels = labels_all[te_idx]
    te_benign = y_te == 0

    # Families present on this day that appear on *no other* day = zero-day.
    other_days = frame.loc[~is_te, "Label"].astype(str).str.strip()
    seen_elsewhere = set(other_days[other_days != "BENIGN"])
    families = sorted({f for f in labels[labels != "BENIGN"]})
    zero_day = [f for f in families if f not in seen_elsewhere]

    print(f"\n{'=' * 84}")
    print(f"{day.upper()}: {int((y==0).sum()):,} benign train rows available, "
          f"{len(x_te):,} test rows scored ({(y_te==1).sum():,} attack)")
    print(f"{len(zero_day)}/{len(families)} families on this day are unseen in training")
    print(f"{'=' * 84}")
    header = (
        f"{'detector':<24}{'train n':>9}{'fit s':>7}{'score s':>8}"
        f"{'AUC all':>9}{'AUC 0day':>10}"
    )
    print(header)
    print("-" * len(header))

    out: dict[str, dict] = {}
    zero_mask = np.isin(labels, zero_day) if zero_day else np.zeros(len(labels), bool)

    for name in DETECTORS:
        cap = DETECTOR_ROW_CAP.get(name, 200_000)
        b_idx = np.flatnonzero(~is_te & (y == 0))
        if len(b_idx) > cap:
            b_idx = rng.choice(b_idx, cap, replace=False)
        x_benign = x_np[b_idx]

        t0 = time.time()
        try:
            scorer = fit_detector(name, x_benign, cfg, rng)
        except Exception as exc:                       # keep the sweep alive
            print(f"{name:<24}{'FAILED':>9}  {type(exc).__name__}: {str(exc)[:44]}")
            continue
        fit_s = time.time() - t0

        t0 = time.time()
        score = scorer(x_te)
        score_s = time.time() - t0

        row = {
            "train_n": int(len(x_benign)),
            "auc_all": auc_vs_benign(score, y_te == 1, te_benign),
            "auc_zero_day": auc_vs_benign(score, zero_mask, te_benign),
        }
        out[name] = row
        print(
            f"{name:<24}{row['train_n']:>9,}{fit_s:>7.1f}{score_s:>8.1f}"
            f"{row['auc_all']:>9.4f}{row['auc_zero_day']:>10.4f}"
        )

    return {"day": day, "zero_day_families": zero_day, "detectors": out}


def main(argv=None) -> None:
    parser = argparse.ArgumentParser(
        description="Benchmark unsupervised detectors for stage 1",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument("--day", default="thu", help="held-out day to score")
    parser.add_argument("--all", action="store_true", help="every day")
    parser.add_argument("--test-sample", type=int, default=100_000)
    args = parser.parse_args(argv)

    cfg = NIDSConfig()
    rng = np.random.default_rng(cfg.random_state)
    days = list(ALL_DAYS) if args.all else [args.day]

    print("[*] Loading and preprocessing the full corpus (one shared matrix)")
    frame = load_days(ALL_DAYS, cfg.data_dir)
    y = normalise_labels(frame["Label"], cfg.include_attempted).to_numpy()
    pre = FlowPreprocessor().fit(frame)
    x_np = pre.transform(frame, impute=True).to_numpy()
    print(f"[*] matrix: {x_np.shape[0]:,} x {x_np.shape[1]}")

    reports = [
        evaluate_day(frame, y, x_np, d, cfg, rng, args.test_sample) for d in days
    ]

    print(f"\n{'=' * 84}\nSUMMARY - mean over evaluated days\n{'=' * 84}")
    names = [n for n in DETECTORS if any(n in r["detectors"] for r in reports)]
    print(f"{'detector':<24}{'AUC all':>12}{'AUC zero-day':>16}")
    for name in names:
        alls = [r["detectors"][name]["auc_all"] for r in reports if name in r["detectors"]]
        zd = [r["detectors"][name]["auc_zero_day"] for r in reports if name in r["detectors"]]
        print(f"{name:<24}{np.nanmean(alls):>12.4f}{np.nanmean(zd):>16.4f}")


if __name__ == "__main__":
    main()