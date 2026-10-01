"""Training / evaluation entrypoint for the SignSight hybrid NIDS.

Evaluation strategy
-------------------
CICIDS2017-improved records one attack family per day (DoS on Wednesday,
Portscan/DDoS on Friday, and so on). A random ``train_test_split`` therefore
puts near-duplicate neighbours of every attack on both sides of the split and
produces numbers that collapse the moment the model meets real traffic.

So the headline number here is **leave-one-day-out (LODO)**: five folds, each
training on four days and scoring the fifth. Every reported probability is an
*out-of-fold* score - the flow was always scored by a model that had never seen
its capture. The FPR-budgeted alert threshold is then solved once on the pooled
OOF scores and attached to the production model, which is finally refit on all
five days. That ordering matters: the threshold is chosen without ever looking
at data the production model trained on.

Usage
-----
    python -m model.train                       # full LODO + production fit
    python -m model.train --strategy holdout    # train Mon-Thu, test Fri
    python -m model.train --max-fpr 0.0005      # tighter SOC budget
    python -m model.train --days mon,tue        # quick smoke run
"""

from __future__ import annotations

import argparse
import json
import time
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import (
    average_precision_score,
    classification_report,
    confusion_matrix,
    roc_auc_score,
)

from .config import ALL_DAYS, DAY_FILES, NIDSConfig
from .data import DAY_COLUMN, FlowPreprocessor, load_days, normalise_labels
from .pipeline import HybridNIDSModel
from .thresholds import OperatingPoint, recall_at_fpr, select_threshold

__all__ = ["train_lodo", "train_holdout", "export_artifacts", "main"]


# --------------------------------------------------------------- metrics ---
def confusion_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> dict:
    tn, fp, fn, tp = confusion_matrix(y_true, y_pred, labels=[0, 1]).ravel()
    recall = tp / (tp + fn) if tp + fn else 0.0
    precision = tp / (tp + fp) if tp + fp else 0.0
    return {
        "tp": int(tp),
        "fp": int(fp),
        "fn": int(fn),
        "tn": int(tn),
        "fpr": float(fp / (fp + tn)) if fp + tn else 0.0,
        "recall": float(recall),
        "precision": float(precision),
        "f1": float(2 * precision * recall / (precision + recall))
        if precision + recall
        else 0.0,
    }


def ranking_metrics(y_true: np.ndarray, proba: np.ndarray) -> dict:
    """Threshold-free quality: how well the *score* ranks attacks above benign."""
    return {
        "roc_auc": float(roc_auc_score(y_true, proba)),
        "pr_auc": float(average_precision_score(y_true, proba)),
        "attack_base_rate": float(np.mean(y_true)),
    }


def save_json(obj: Any, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as fh:
        json.dump(obj, fh, indent=2, default=_json_default)


def _json_default(obj: Any) -> Any:
    if isinstance(obj, (np.integer,)):
        return int(obj)
    if isinstance(obj, (np.floating,)):
        return float(obj)
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    if isinstance(obj, (np.bool_,)):
        return bool(obj)
    if isinstance(obj, Path):
        return str(obj)
    return str(obj)


# ------------------------------------------------------------------ LODO ---
def train_lodo(cfg: NIDSConfig, days: list[str] | None = None) -> dict:
    days = list(ALL_DAYS if days is None else days)
    print(f"[*] Loading {len(days)} capture day(s) from {cfg.data_dir}")
    frame = load_days(days, cfg.data_dir)
    y_all = normalise_labels(
        frame["Label"], include_attempted=cfg.include_attempted
    ).to_numpy()

    oof_proba = np.full(len(frame), np.nan, dtype=np.float64)
    oof_anomaly = np.full(len(frame), np.nan, dtype=np.float64)
    folds: list[dict] = []

    for test_day in days:
        started = time.time()
        is_test = (frame[DAY_COLUMN] == test_day).to_numpy()
        df_tr = frame.loc[~is_test].reset_index(drop=True)
        df_te = frame.loc[is_test].reset_index(drop=True)
        y_tr = y_all[~is_test]
        y_te = y_all[is_test]

        print(
            f"[*] Fold {test_day}: train={len(df_tr):,} ({int((y_tr==1).sum()):,} attack)"
            f"  test={len(df_te):,} ({int((y_te==1).sum()):,} attack)"
        )
        model = HybridNIDSModel(cfg)
        model.fit(df_tr, y_tr)
        proba_te = model.attack_probability(df_te)
        anom_te = model.anomaly_score(df_te)

        oof_proba[is_test] = proba_te
        oof_anomaly[is_test] = anom_te

        # A pure-benign or pure-attack day (Monday is entirely benign) has no
        # threshold to solve, but it still contributes honest OOF scores - and
        # those benign scores are exactly what the FPR budget is measured on.
        if (y_te == 1).sum() == 0 or (y_te == 0).sum() == 0:
            kind = "benign-only" if (y_te == 1).sum() == 0 else "attack-only"
            print(f"    single-class fold ({kind}); scored, threshold not solved here")
            folds.append(
                {
                    "test_day": test_day,
                    "file": DAY_FILES.get(test_day, test_day),
                    "n_test": int(is_test.sum()),
                    "n_test_attack": int(y_te.sum()),
                    "single_class": kind,
                    "_y": y_te,
                    "_proba": proba_te,
                }
            )
            continue
        # Each fold carries its own honest operating point for diagnostics...
        fold_point = select_threshold(
            y_te, proba_te, max_fpr=cfg.max_fpr, confidence=cfg.fpr_confidence
        )

        oof_proba[is_test] = proba_te
        oof_anomaly[is_test] = anom_te

        # ...but the *reported* fold numbers use the single global threshold so
        # that folds are comparable to each other.
        folds.append(
            {
                "test_day": test_day,
                "file": DAY_FILES.get(test_day, test_day),
                "n_test": int(is_test.sum()),
                "n_test_attack": int(y_te.sum()),
                "attack_families_unseen_in_train": sorted(
                    set(frame.loc[is_test & (frame["Label"] != "BENIGN"), "Label"])
                    - set(frame.loc[~is_test & (frame["Label"] != "BENIGN"), "Label"])
                ),
                "fold_local_operating_point": fold_point.to_dict(),
                "scores": {
                    "anomaly_mean_benign": float(
                        anom_te[y_te == 0].mean() if (y_te == 0).any() else 0.0
                    ),
                    "anomaly_mean_attack": float(
                        anom_te[y_te == 1].mean() if (y_te == 1).any() else 0.0
                    ),
                },
                **_ranking_metrics(y_te, proba_te),
                "_proba": proba_te,
                "_y": y_te,
                "_anomaly": anom_te,
            }
        )
        print(
            f"    fold ROC-AUC={folds[-1]['roc_auc']:.4f}"
            f"  PR-AUC={folds[-1]['pr_auc']:.4f}"
            f"  ({time.time() - started:.0f}s)"
        )

    if np.isnan(oof_proba).any():
        raise RuntimeError("out-of-fold coverage gap - some flows were never scored")

    # ---- the single production operating point, from OOF scores only ----
    op_oof = select_threshold(
        y_all, oof_proba, max_fpr=cfg.max_fpr, confidence=cfg.fpr_confidence
    )
    print(
        f"\n[*] OOF operating point @ FPR budget {cfg.max_fpr:.4%}: "
        f"threshold={op_oof.threshold:.6f}  FPR={op_oof.fpr:.5%}"
        f" (95% UB {op_oof.fpr_upper_bound:.5%})  recall={op_oof.recall:.4f}"
    )

    pred_oof = (oof_proba >= op_oof.threshold).astype(np.int8)
    for fold in folds:
        # Score against this fold's own rows, not the pooled prediction vector.
        fold_pred = pred_oof[is_test_mask(fold, frame)]
        if "single_class" in fold:
            # Precision/recall are undefined on a single-class day, so report
            # raw alert volume instead - for a benign-only day that count *is*
            # the false positive count.
            alerts = int(fold_pred.sum())
            fold["alerts_at_global_threshold"] = alerts
            fold["benign_alert_rate"] = (
                alerts / len(fold_pred) if "benign" in fold["single_class"] else None
            )
        else:
            fold["at_global_threshold"] = confusion_metrics(fold["_y"], fold_pred)

    # ---- stage-1 ablation: does the anomaly score actually earn its place? --
    ablation = _stage1_ablation(
        frame, y_all, oof_proba, oof_anomaly, op_oof, cfg, days
    )

    evaluation = {
        "strategy": "leave-one-day-out",
        "days": days,
        "fpr_budget": cfg.max_fpr,
        "operating_point": op_oof.to_dict(),
        "pooled_oof": confusion_metrics(y_all, pred_oof)
        | _ranking_metrics(y_all, oof_proba)
        | {
            "n_flows": int(len(frame)),
            "n_attack": int(y_all.sum()),
            "report_at_threshold": classification_report(
                y_all, pred_oof, target_names=["BENIGN", "ATTACK"], digits=4
            ),
        },
        "recall_at_fpr_grid": recall_at_fpr(y_all, oof_proba),
        "stage1_ablation": ablation,
        "folds": [{k: v for k, v in f.items() if not k.startswith("_")} for f in folds],
    }

    # ---- production model: refit on everything, keep the OOF threshold ----
    print("[*] Fitting production model on all days (threshold locked from OOF)")
    prod = HybridNIDSModel(cfg)
    prod.fit(frame, y_all)
    prod.operating_point_ = op_oof
    prod.set_threshold(op_oof.threshold)

    return {
        "evaluation": evaluation,
        "model": prod,
        "frame": frame,
        "y": y_all,
        "oof_proba": oof_proba,
        "oof_anomaly": oof_anomaly,
        "operating_point": op_oof,
        "folds": folds,
    }


def _stage1_ablation(
    frame: pd.DataFrame,
    y: np.ndarray,
    hybrid_proba: np.ndarray,
    anomaly: np.ndarray,
    hybrid_op: OperatingPoint,
    cfg: NIDSConfig,
    days: list[str],
) -> dict:
    """Quantify stage 1's contribution: hybrid vs. LightGBM-only, same protocol.

    The reference is trained with the *same* leave-one-day-out folds and the
    *same* FPR budget, so the only difference is the presence of the anomaly
    column.  If the hybrid does not win, the extra model is dead weight and
    should be cut.
    """
    from lightgbm import LGBMClassifier

    print("[*] Ablation: LightGBM-only control (same LODO folds, same budget)")
    oof_plain = np.zeros(len(frame), dtype=np.float64)
    for test_day in days:
        is_test = (frame[DAY_COLUMN] == test_day).to_numpy()
        pre = FlowPreprocessor().fit(frame.loc[~is_test])
        x_tr = pre.transform(frame.loc[~is_test], impute=False)
        x_te = pre.transform(frame.loc[is_test], impute=False)
        # Mirror the main loop: a single-class training day cannot support a
        # binary fit, so score it neutrally rather than crashing the ablation.
        if len(np.unique(y[~is_test])) < 2:
            oof_plain[is_test] = float(y[~is_test].mean())
            continue
        clf = LGBMClassifier(objective="binary", **cfg.stage2.as_params())
        clf.fit(x_tr, y[~is_test])
        oof_plain[is_test] = clf.predict_proba(x_te)[
            :, list(clf.classes_).index(1)
        ]
    plain_op = select_threshold(
        y, oof_plain, max_fpr=cfg.max_fpr, confidence=cfg.fpr_confidence
    )

    print(
        f"    hybrid     : threshold={hybrid_op.threshold:.6f} "
        f"recall={hybrid_op.recall:.4f} prec={hybrid_op.precision:.4f} "
        f"PR-AUC={average_precision_score(y, hybrid_proba):.4f}"
    )
    print(
        f"    stage2 only: threshold={plain_op.threshold:.6f} "
        f"recall={plain_op.recall:.4f} prec={plain_op.precision:.4f} "
        f"PR-AUC={average_precision_score(y, oof_plain):.4f}"
    )
    return {
        "protocol": "identical leave-one-day-out folds and FPR budget",
        "hybrid_oof": {
            "operating_point": hybrid_op.to_dict(),
            **_ranking_metrics(y, hybrid_proba),
        },
        "stage2_only_oof": {
            "operating_point": plain_op.to_dict(),
            **_ranking_metrics(y, oof_plain),
        },
        "delta_recall": float(hybrid_op.recall - plain_op.recall),
        "delta_pr_auc": float(
            average_precision_score(y, hybrid_proba)
            - average_precision_score(y, oof_plain)
        ),
        "stage1_standalone": {
            "auc_anomaly_score_only": float(roc_auc_score(y, anomaly)),
            "mean_anomaly_benign": float(anomaly[y == 0].mean()),
            "mean_anomaly_attack": float(anomaly[y == 1].mean()),
            "note": (
                "An unsupervised score in isolation; it is a feature for stage 2, "
                "not a detector. AUC below is expected to be modest - the "
                "interesting number is delta_recall / delta_pr_auc."
            ),
        },
        # The pooled number hides which families actually generalise, and under
        # LODO the failure is always family-shaped: a day whose families are
        # absent from training. This is the table to read before trusting the
        # headline recall.
        "per_family": _per_family_breakdown(
            frame, y, hybrid_proba, hybrid_op.threshold, train_frame=None
        ),
    }


def is_test_mask(fold: dict, frame: pd.DataFrame) -> np.ndarray:
    """Row mask for a fold's held-out day, so fold metrics index the pooled OOF
    predictions without assuming folds arrive in dataset order."""
    return (frame[DAY_COLUMN] == fold["test_day"]).to_numpy()


def _ranking_metrics(y_true: np.ndarray, proba: np.ndarray) -> dict:
    return {
        "roc_auc": float(roc_auc_score(y_true, proba)),
        "pr_auc": float(average_precision_score(y_true, proba)),
        "attack_base_rate": float(np.mean(y_true)),
    }


# --------------------------------------------------------------- holdout ---
def train_holdout(cfg: NIDSConfig, train_days=None, test_days=None) -> dict:
    """Train Mon-Thu, evaluate Fri. Friday's Portscan/DDoS/Botnet never appear
    in training, which is the closest thing this dataset has to a true zero-day
    scenario."""
    train_days = list(train_days or ["mon", "tue", "wed", "thu"])
    test_days = list(test_days or ["fri"])
    frame_tr = load_days(train_days, cfg.data_dir)
    frame_te = load_days(test_days, cfg.data_dir)
    y_tr = normalise_labels(frame_tr["Label"], cfg.include_attempted).to_numpy()
    y_te = normalise_labels(frame_te["Label"], cfg.include_attempted).to_numpy()

    print(f"[*] Holdout fit on {train_days}")
    model = HybridNIDSModel(cfg)
    model.fit(frame_tr, y_tr)

    print(f"[*] Scoring held-out {test_days} ({len(frame_te):,} flows)")
    proba_te = model.attack_probability(frame_te)
    anom_te = model.anomaly_score(frame_te)
    op = select_threshold(
        y_te, proba_te, max_fpr=cfg.max_fpr, confidence=cfg.fpr_confidence
    )
    model.operating_point_ = op
    model.set_threshold(op.threshold)
    pred = (proba_te >= op.threshold).astype(np.int8)

    unseen = sorted(
        set(frame_te.loc[frame_te["Label"] != "BENIGN", "Label"])
        - set(frame_tr.loc[frame_tr["Label"] != "BENIGN", "Label"])
    )
    per_family = _per_family_breakdown(frame_te, y_te, proba_te, op.threshold)

    evaluation = {
        "strategy": "day-holdout (zero-day families)",
        "train_days": train_days,
        "test_days": test_days,
        "attack_families_unseen_in_train": unseen,
        "operating_point": op.to_dict(),
        "pooled": confusion_metrics(y_te, pred)
        | _ranking_metrics(y_te, proba_te)
        | {
            "n_flows": int(len(frame_te)),
            "n_attack": int(y_te.sum()),
            "report_at_threshold": classification_report(
                y_te, pred, target_names=["BENIGN", "ATTACK"], digits=4
            ),
        },
        "per_family": per_family,
        "stage1_separation": {
            "mean_anomaly_benign": float(anom_te[y_te == 0].mean()),
            "mean_anomaly_attack": float(anom_te[y_te == 1].mean()),
            "auc_anomaly_only": float(roc_auc_score(y_te, anom_te)),
        },
    }
    return {
        "evaluation": evaluation,
        "model": model,
        "frame": frame_te,
        "y": y_te,
        "operating_point": op,
    }


def _per_family_breakdown(
    frame: pd.DataFrame,
    y: np.ndarray,
    proba: np.ndarray,
    threshold: float,
    train_frame: pd.DataFrame | None = None,
) -> list[dict]:
    """Per-attack-family recall - the number a SOC actually reviews.

    ``train_frame`` enables the column that actually matters: whether the family
    was present during training at all. Under leave-one-day-out on CICIDS2017
    essentially every held-out family is unseen, which is the difference between
    "the model generalises" and "the model recognised this exact attack".
    """
    labels = frame["Label"].astype(str).str.strip()
    seen = set()
    if train_frame is not None:
        seen = set(train_frame["Label"].astype(str).str.strip())

    rows = []
    for label in sorted(set(labels[labels != "BENIGN"])):
        mask = (labels == label).to_numpy()
        rows.append(
            {
                "family": label,
                "n": int(mask.sum()),
                "seen_in_training": label in seen,
                "recall_at_threshold": float(np.mean(proba[mask] >= threshold)),
                "mean_probability": float(proba[mask].mean()),
            }
        )
    return sorted(rows, key=lambda r: r["recall_at_threshold"])


def _worst_families(evaluation: dict, top: int = 12) -> list[dict]:
    """Families the model misses worst, preferring ones never seen in training."""
    per = (
        evaluation.get("stage1_ablation", {}).get("per_family")
        or evaluation.get("per_family")
        or []
    )
    unseen = [p for p in per if not p.get("seen_in_training", True)]
    if not unseen:                      # run did not annotate seen/unseen
        unseen = per
    return sorted(unseen, key=lambda r: r["recall_at_threshold"])[:top]


# -------------------------------------------------------------- artefacts ---
def export_artifacts(run: dict, cfg: NIDSConfig) -> Path:
    out = cfg.artifact_dir
    out.mkdir(parents=True, exist_ok=True)
    model: HybridNIDSModel = run["model"]

    model.save(out / "signsight_hybrid.joblib")
    save_json(model.to_card(), out / "model_card.json")
    save_json(run["evaluation"], out / "evaluation.json")
    save_json(cfg.to_dict(), out / "config.json")
    model.feature_importance(top=50).to_csv(
        out / "feature_importance.csv", index=False
    )

    frame = run["frame"]
    sample = frame.sample(n=min(50_000, len(frame)), random_state=cfg.random_state)
    alerts = [a for a in model.triage(sample) if a["verdict"].startswith("ATTACK")]
    save_json(alerts[:25], out / "sample_soc_alerts.json")
    return out


# ------------------------------------------------------------------- cli ---
def print_report(evaluation: dict) -> None:
    pooled = evaluation.get("pooled_oof") or evaluation["pooled"]
    op = evaluation["operating_point"]
    bar = "=" * 72
    print(f"\n{bar}\n  SIGNSIGHT HYBRID NIDS - ENTERPRISE EVALUATION\n{bar}")
    print(f"  Strategy                : {evaluation['strategy']}")
    print(f"  Flow base rate (attack) : {pooled['attack_base_rate']:.4%}")
    print("  " + "-" * 68)
    print(f"  FPR budget              : {evaluation['fpr_budget']:.4%}")
    print(f"  FPR observed            : {op['fpr']:.5%}")
    print(f"  FPR 95% upper bound     : {op['fpr_upper_bound_95']:.5%}")
    print(f"  Alert threshold         : {op['threshold']:.6f}")
    print("  " + "-" * 68)
    print(f"  ROC-AUC                 : {pooled['roc_auc']:.4f}")
    print(f"  PR-AUC (avg precision)  : {pooled['pr_auc']:.4f}")
    print(f"  Recall @ budget         : {op['recall']:.4f}")
    print(f"  Precision @ budget      : {op['precision']:.4f}")
    print(f"  Alerts per 10k flows    : {op['alerts_per_10k_flows']:.2f}")
    print(bar)
    print(pooled["report_at_threshold"])
    if "folds" in evaluation:
        print("  Per-fold (leave-one-day-out). CICIDS2017 puts each attack family")
        print("  on exactly one day, so every held-out family is UNSEEN in training:")
        print(
            f"    {'day':<5}{'n_test':>10}{'attacks':>10}{'ROC-AUC':>10}"
            f"{'PR-AUC':>10}{'recall':>9}{'FPR':>10}"
        )
        for fold in evaluation["folds"]:
            if "single_class" in fold:
                rate = fold.get("benign_alert_rate")
                rate_txt = f"{rate:.5%}" if rate is not None else "n/a"
                print(
                    f"    {fold['test_day']:<5}{fold['n_test']:>10,}"
                    f"{fold['n_test_attack']:>10,}{'-':>10}{'-':>10}{'-':>9}"
                    f"{rate_txt:>10}   ({fold['single_class']})"
                )
                continue
            at = fold["at_global_threshold"]
            print(
                f"    {fold['test_day']:<5}{fold['n_test']:>10,}{fold['n_test_attack']:>10,}"
                f"{fold['roc_auc']:>10.4f}{fold['pr_auc']:>10.4f}"
                f"{at['recall']:>9.4f}{at['fpr']:>10.5f}"
            )
        print()
        worst = _worst_families(evaluation)
        if worst:
            print("  Weakest families (these are all zero-day: unseen in training)")
            print(f"    {'family':<40}{'n':>9}{'recall':>9}")
            for row in worst:
                print(
                    f"    {row['family']:<40}{row['n']:>9,}"
                    f"{row['recall_at_threshold']:>9.4f}"
                )
            print()
    if evaluation.get("stage1_separation"):
        sep = evaluation["stage1_separation"]
        print(
            f"  Stage 1 anomaly score   : benign mean {sep['mean_anomaly_benign']:.4f}"
            f" vs attack mean {sep['mean_anomaly_attack']:.4f}"
        )
        if "auc_anomaly_only" in sep:
            print(f"  Stage 1 alone (AUC)     : {sep['auc_anomaly_only']:.4f}")


def main(argv=None) -> None:
    parser = argparse.ArgumentParser(
        description="Train and evaluate the SignSight IsolationForest + LightGBM NIDS",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument(
        "--strategy", choices=["lodo", "holdout"], default="lodo",
        help="lodo = leave-one-day-out CV; holdout = train Mon-Thu, test Fri",
    )
    parser.add_argument("--days", default=None, help="comma separated subset, e.g. mon,tue")
    parser.add_argument("--max-fpr", type=float, default=None, help="SOC false positive budget")
    parser.add_argument("--data-dir", default=None)
    parser.add_argument("--artifact-dir", default=None)
    parser.add_argument("--quiet", action="store_true", help="suppress per-fold logs")
    args = parser.parse_args(argv)

    cfg = NIDSConfig()
    if args.max_fpr is not None:
        cfg.max_fpr = args.max_fpr
    if args.data_dir:
        cfg.data_dir = Path(args.data_dir)
    if args.artifact_dir:
        cfg.artifact_dir = Path(args.artifact_dir)

    days = [d.strip() for d in args.days.split(",")] if args.days else None

    if args.strategy == "lodo":
        run = train_lodo(cfg, days)
    else:
        run = train_holdout(cfg)

    print_report(run["evaluation"])
    out = export_artifacts(run, cfg)
    print(f"\n[*] Model      : {out / 'signsight_hybrid.joblib'}")
    print(f"[*] Model card : {out / 'model_card.json'}")
    print(f"[*] Evaluation : {out / 'evaluation.json'}")
    print(f"[*] Sample SOC alerts : {out / 'sample_soc_alerts.json'}")


if __name__ == "__main__":
    main()