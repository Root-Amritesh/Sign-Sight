"""Visualization utilities for SignSight hybrid NIDS.

Generates evaluation graphs from training artifacts and evaluation JSON.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns

# Style configuration
sns.set_theme(style="whitegrid", context="paper", font_scale=1.1)
plt.rcParams["figure.dpi"] = 150
plt.rcParams["savefig.dpi"] = 300
plt.rcParams["figure.figsize"] = (8, 5)
plt.rcParams["font.family"] = "DejaVu Sans"


# Color palette
COLORS = {
    "benign": "#2e7d32",  # green
    "attack": "#c62828",  # red
    "hybrid": "#1565c0",  # blue
    "stage2_only": "#f9a825",  # amber
    "threshold": "#6a1b9a",  # purple
    "grid": "#e0e0e0",
}


def load_evaluation(artifact_dir: Path) -> dict[str, Any]:
    """Load evaluation.json from artifact directory."""
    eval_path = artifact_dir / "evaluation.json"
    with eval_path.open("r") as f:
        return json.load(f)


def load_feature_importance(artifact_dir: Path) -> pd.DataFrame:
    """Load feature_importance.csv from artifact directory."""
    fi_path = artifact_dir / "feature_importance.csv"
    return pd.read_csv(fi_path)


def load_per_family(artifact_dir: Path) -> list[dict] | None:
    """Load per_family.json from artifact directory if it exists."""
    pf_path = artifact_dir / "per_family.json"
    if pf_path.exists():
        with pf_path.open("r") as f:
            return json.load(f)
    return None


def load_oof_scores(artifact_dir: Path) -> tuple[np.ndarray, np.ndarray] | None:
    """Load OOF probabilities and labels from artifact directory if they exist."""
    proba_path = artifact_dir / "oof_proba.npy"
    labels_path = artifact_dir / "oof_labels.npy"
    if proba_path.exists() and labels_path.exists():
        return np.load(proba_path), np.load(labels_path)
    return None


def plot_roc_pr_curves(evaluation: dict[str, Any], out_dir: Path) -> None:
    """Plot ROC and PR curves from recall_at_fpr_grid data."""
    grid = evaluation.get("recall_at_fpr_grid", [])
    if not grid:
        return

    fprs = [g["fpr"] for g in grid]
    recalls = [g["recall"] for g in grid]
    precisions = [g["precision"] for g in grid]
    thresholds = [g["threshold"] for g in grid]

    fig, axes = plt.subplots(1, 2, figsize=(14, 5))

    # ROC Curve
    ax = axes[0]
    ax.plot(fprs, recalls, "o-", color=COLORS["hybrid"], linewidth=2, markersize=5, label="Hybrid (IsolationForest + LightGBM)")
    ax.plot([0, 1], [0, 1], "k--", alpha=0.3, label="Random")
    ax.set_xlabel("False Positive Rate (FPR)")
    ax.set_ylabel("True Positive Rate (Recall)")
    ax.set_title("ROC Curve (Out-of-Fold)")
    ax.legend(loc="lower right")
    ax.grid(True, alpha=0.3)

    # Mark operating point
    op = evaluation.get("operating_point", {})
    if op:
        ax.plot(op["fpr"], op["recall"], "s", color=COLORS["threshold"], markersize=10,
                label=f'Operating Point (FPR={op["fpr"]:.4%})')
        ax.legend(loc="lower right")

    # PR Curve
    ax = axes[1]
    ax.plot(recalls, precisions, "o-", color=COLORS["hybrid"], linewidth=2, markersize=5, label="Hybrid")
    base_rate = evaluation.get("pooled_oof", {}).get("attack_base_rate", 0)
    ax.axhline(base_rate, color="k", linestyle="--", alpha=0.3, label=f"Base rate ({base_rate:.1%})")
    ax.set_xlabel("Recall")
    ax.set_ylabel("Precision")
    ax.set_title("Precision-Recall Curve (Out-of-Fold)")
    ax.legend(loc="lower left")
    ax.grid(True, alpha=0.3)

    if op:
        ax.plot(op["recall"], op["precision"], "s", color=COLORS["threshold"], markersize=10,
                label=f'Operating Point (P={op["precision"]:.4f})')
        ax.legend(loc="lower left")

    plt.tight_layout()
    plt.savefig(out_dir / "roc_pr_curves.png", bbox_inches="tight")
    plt.close()


def plot_fpr_recall_tradeoff(evaluation: dict[str, Any], out_dir: Path) -> None:
    """Plot the FPR vs Recall tradeoff with threshold annotations."""
    grid = evaluation.get("recall_at_fpr_grid", [])
    if not grid:
        return

    fprs = [g["fpr"] for g in grid]
    recalls = [g["recall"] for g in grid]
    thresholds = [g["threshold"] for g in grid]
    alerts_per_10k = [g["alerts_per_10k_flows"] for g in grid]

    fig, axes = plt.subplots(1, 2, figsize=(14, 5))

    # FPR vs Recall
    ax = axes[0]
    ax.plot(fprs, recalls, "o-", color=COLORS["hybrid"], linewidth=2, markersize=6)
    op = evaluation.get("operating_point", {})
    if op:
        ax.plot(op["fpr"], op["recall"], "s", color=COLORS["threshold"], markersize=12,
                zorder=5, label=f'Selected: FPR={op["fpr"]:.4%}, Recall={op["recall"]:.4f}')
        ax.axvline(op["fpr"], color=COLORS["threshold"], linestyle=":", alpha=0.5)
        ax.axhline(op["recall"], color=COLORS["threshold"], linestyle=":", alpha=0.5)
        ax.legend()
    ax.set_xscale("log")
    ax.set_xlabel("False Positive Rate (log scale)")
    ax.set_ylabel("Recall")
    ax.set_title("FPR vs Recall Tradeoff")
    ax.grid(True, alpha=0.3, which="both")

    # Threshold vs Alerts per 10k flows
    ax = axes[1]
    ax.plot(thresholds, alerts_per_10k, "o-", color=COLORS["stage2_only"], linewidth=2, markersize=6)
    ax.set_xscale("log")
    ax.set_xlabel("Alert Threshold (log scale)")
    ax.set_ylabel("Alerts per 10k flows")
    ax.set_title("Threshold vs Alert Volume")
    ax.grid(True, alpha=0.3, which="both")
    if op:
        ax.axvline(op["threshold"], color=COLORS["threshold"], linestyle=":", alpha=0.5,
                   label=f'Threshold = {op["threshold"]:.2e}')
        ax.legend()

    plt.tight_layout()
    plt.savefig(out_dir / "fpr_recall_tradeoff.png", bbox_inches="tight")
    plt.close()


def plot_fold_metrics(evaluation: dict[str, Any], out_dir: Path) -> None:
    """Plot per-fold metrics for leave-one-day-out evaluation."""
    folds = evaluation.get("folds", [])
    if not folds:
        return

    fold_data = []
    for f in folds:
        if "single_class" in f:
            continue
        at = f.get("at_global_threshold", {})
        fold_data.append({
            "day": f["test_day"],
            "n_test": f["n_test"],
            "n_attack": f["n_test_attack"],
            "roc_auc": f["roc_auc"],
            "pr_auc": f["pr_auc"],
            "recall": at.get("recall", 0),
            "precision": at.get("precision", 0),
            "fpr": at.get("fpr", 0),
            "attack_base_rate": f["attack_base_rate"],
        })

    if not fold_data:
        return

    df = pd.DataFrame(fold_data)

    fig, axes = plt.subplots(2, 2, figsize=(14, 10))

    # ROC-AUC per fold
    ax = axes[0, 0]
    bars = ax.bar(df["day"], df["roc_auc"], color=COLORS["hybrid"], alpha=0.8, edgecolor="black")
    ax.axhline(df["roc_auc"].mean(), color=COLORS["threshold"], linestyle="--",
               label=f'Mean: {df["roc_auc"].mean():.4f}')
    ax.set_ylabel("ROC-AUC")
    ax.set_title("ROC-AUC per Fold (Leave-One-Day-Out)")
    ax.legend()
    ax.grid(True, alpha=0.3, axis="y")

    # PR-AUC per fold
    ax = axes[0, 1]
    bars = ax.bar(df["day"], df["pr_auc"], color=COLORS["stage2_only"], alpha=0.8, edgecolor="black")
    ax.axhline(df["pr_auc"].mean(), color=COLORS["threshold"], linestyle="--",
               label=f'Mean: {df["pr_auc"].mean():.4f}')
    ax.set_ylabel("PR-AUC")
    ax.set_title("PR-AUC per Fold (Leave-One-Day-Out)")
    ax.legend()
    ax.grid(True, alpha=0.3, axis="y")

    # Recall & Precision per fold
    ax = axes[1, 0]
    x = np.arange(len(df))
    width = 0.35
    ax.bar(x - width/2, df["recall"], width, label="Recall", color=COLORS["attack"], alpha=0.8)
    ax.bar(x + width/2, df["precision"], width, label="Precision", color=COLORS["benign"], alpha=0.8)
    ax.set_xticks(x)
    ax.set_xticklabels(df["day"])
    ax.set_ylabel("Score")
    ax.set_title("Recall & Precision at Global Threshold per Fold")
    ax.legend()
    ax.grid(True, alpha=0.3, axis="y")

    # FPR per fold
    ax = axes[1, 1]
    bars = ax.bar(df["day"], df["fpr"], color=COLORS["threshold"], alpha=0.8, edgecolor="black")
    op = evaluation.get("operating_point", {})
    if op:
        ax.axhline(op["fpr"], color="red", linestyle="--",
                   label=f'Budget: {op["fpr"]:.5%}')
        ax.axhline(op["fpr_upper_bound_95"], color="red", linestyle=":",
                   label=f'95% UB: {op["fpr_upper_bound_95"]:.5%}')
        ax.legend()
    ax.set_ylabel("FPR")
    ax.set_title("False Positive Rate per Fold")
    ax.grid(True, alpha=0.3, axis="y")

    plt.tight_layout()
    plt.savefig(out_dir / "fold_metrics.png", bbox_inches="tight")
    plt.close()


def plot_confusion_matrix(evaluation: dict[str, Any], out_dir: Path) -> None:
    """Plot confusion matrix from pooled OOF results."""
    pooled = evaluation.get("pooled_oof", evaluation.get("pooled", {}))
    tp = pooled.get("tp", 0)
    fp = pooled.get("fp", 0)
    fn = pooled.get("fn", 0)
    tn = pooled.get("tn", 0)

    cm = np.array([[tn, fp], [fn, tp]])
    cm_norm = cm.astype(float) / cm.sum(axis=1)[:, np.newaxis]

    fig, axes = plt.subplots(1, 2, figsize=(12, 5))

    # Absolute counts
    ax = axes[0]
    sns.heatmap(cm, annot=True, fmt="d", cmap="Blues", ax=ax,
                xticklabels=["Predicted Benign", "Predicted Attack"],
                yticklabels=["Actual Benign", "Actual Attack"])
    ax.set_title("Confusion Matrix (Counts)")

    # Normalized
    ax = axes[1]
    sns.heatmap(cm_norm, annot=True, fmt=".2%", cmap="Blues", ax=ax,
                xticklabels=["Predicted Benign", "Predicted Attack"],
                yticklabels=["Actual Benign", "Actual Attack"])
    ax.set_title("Confusion Matrix (Row-normalized)")

    plt.tight_layout()
    plt.savefig(out_dir / "confusion_matrix.png", bbox_inches="tight")
    plt.close()


def plot_stage1_ablation(evaluation: dict[str, Any], out_dir: Path) -> None:
    """Plot stage 1 ablation comparison."""
    ablation = evaluation.get("stage1_ablation", {})
    if not ablation:
        return

    hybrid_op = ablation.get("hybrid_oof", {}).get("operating_point", {})
    stage2_op = ablation.get("stage2_only_oof", {}).get("operating_point", {})

    fig, axes = plt.subplots(1, 3, figsize=(15, 5))

    # Recall comparison
    ax = axes[0]
    models = ["Hybrid\n(IF + LightGBM)", "Stage 2 Only\n(LightGBM)"]
    recalls = [hybrid_op.get("recall", 0), stage2_op.get("recall", 0)]
    bars = ax.bar(models, recalls, color=[COLORS["hybrid"], COLORS["stage2_only"]], alpha=0.8, edgecolor="black")
    for bar, val in zip(bars, recalls):
        ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.01,
                f"{val:.4f}", ha="center", va="bottom", fontweight="bold")
    ax.set_ylabel("Recall")
    ax.set_title("Recall at FPR Budget")
    ax.set_ylim(0, max(recalls) * 1.2)
    ax.grid(True, alpha=0.3, axis="y")

    # Precision comparison
    ax = axes[1]
    precisions = [hybrid_op.get("precision", 0), stage2_op.get("precision", 0)]
    bars = ax.bar(models, precisions, color=[COLORS["hybrid"], COLORS["stage2_only"]], alpha=0.8, edgecolor="black")
    for bar, val in zip(bars, precisions):
        ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.001,
                f"{val:.4f}", ha="center", va="bottom", fontweight="bold")
    ax.set_ylabel("Precision")
    ax.set_title("Precision at FPR Budget")
    ax.set_ylim(min(precisions) * 0.99, 1.01)
    ax.grid(True, alpha=0.3, axis="y")

    # PR-AUC comparison
    ax = axes[2]
    hybrid_pr = ablation.get("hybrid_oof", {}).get("pr_auc", 0)
    stage2_pr = ablation.get("stage2_only_oof", {}).get("pr_auc", 0)
    pr_aucs = [hybrid_pr, stage2_pr]
    bars = ax.bar(models, pr_aucs, color=[COLORS["hybrid"], COLORS["stage2_only"]], alpha=0.8, edgecolor="black")
    for bar, val in zip(bars, pr_aucs):
        ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.0001,
                f"{val:.4f}", ha="center", va="bottom", fontweight="bold")
    delta = ablation.get("delta_pr_auc", 0)
    ax.set_ylabel("PR-AUC")
    ax.set_title(f"PR-AUC (Δ = {delta:+.4f})")
    ax.set_ylim(min(pr_aucs) * 0.999, 1.0005)
    ax.grid(True, alpha=0.3, axis="y")

    plt.tight_layout()
    plt.savefig(out_dir / "stage1_ablation.png", bbox_inches="tight")
    plt.close()

    # Stage 1 standalone anomaly score distribution
    standalone = ablation.get("stage1_standalone", {})
    if standalone:
        fig, ax = plt.subplots(figsize=(8, 5))
        benign_mean = standalone.get("mean_anomaly_benign", 0)
        attack_mean = standalone.get("mean_anomaly_attack", 0)
        auc = standalone.get("auc_anomaly_score_only", 0)

        categories = ["Benign", "Attack"]
        means = [benign_mean, attack_mean]
        bars = ax.bar(categories, means, color=[COLORS["benign"], COLORS["attack"]], alpha=0.8, edgecolor="black")
        for bar, val in zip(bars, means):
            ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.005,
                    f"{val:.4f}", ha="center", va="bottom", fontweight="bold")
        ax.set_ylabel("Mean Anomaly Score (higher = more anomalous)")
        ax.set_title(f"Stage 1 Isolation Forest: Anomaly Score Separation\nAUC (anomaly score only) = {auc:.4f}")
        ax.grid(True, alpha=0.3, axis="y")
        plt.tight_layout()
        plt.savefig(out_dir / "stage1_anomaly_separation.png", bbox_inches="tight")
        plt.close()


def plot_feature_importance(artifact_dir: Path, out_dir: Path, top_n: int = 20) -> None:
    """Plot feature importance from feature_importance.csv."""
    try:
        df = load_feature_importance(artifact_dir)
    except FileNotFoundError:
        return

    # Separate stage1 (anomaly score) from flow features
    df_stage1 = df[df["stage"] == "stage1"].head(top_n)
    df_flow = df[df["stage"] == "flow"].head(top_n)

    fig, axes = plt.subplots(1, 2, figsize=(16, 8))

    # Stage 1 features (usually just anomaly_score)
    ax = axes[0]
    if len(df_stage1) > 0:
        df_plot = df_stage1.sort_values("gain", ascending=True)
        bars = ax.barh(df_plot["feature"], df_plot["gain"], color=COLORS["hybrid"], alpha=0.8, edgecolor="black")
        ax.set_xlabel("Gain (Importance)")
        ax.set_title("Stage 1 Features (Isolation Forest Anomaly Score)")
        ax.grid(True, alpha=0.3, axis="x")
    else:
        ax.text(0.5, 0.5, "No stage1 features", ha="center", va="center", transform=ax.transAxes)

    # Flow features
    ax = axes[1]
    if len(df_flow) > 0:
        df_plot = df_flow.sort_values("gain", ascending=True).head(top_n)
        bars = ax.barh(df_plot["feature"], df_plot["gain"], color=COLORS["stage2_only"], alpha=0.8, edgecolor="black")
        ax.set_xlabel("Gain (Importance)")
        ax.set_title(f"Top {top_n} Flow Features (LightGBM)")
        ax.grid(True, alpha=0.3, axis="x")
    else:
        ax.text(0.5, 0.5, "No flow features", ha="center", va="center", transform=ax.transAxes)

    plt.tight_layout()
    plt.savefig(out_dir / "feature_importance.png", bbox_inches="tight")
    plt.close()


def plot_per_family_recall(evaluation: dict[str, Any], artifact_dir: Path, out_dir: Path) -> None:
    """Plot per-attack-family recall."""
    # Try to load from saved per_family.json first
    per_family = load_per_family(artifact_dir)
    
    # Fallback: check stage1_ablation (where it might live in older evaluations)
    if not per_family:
        per_family = evaluation.get("stage1_ablation", {}).get("per_family")
    if not per_family:
        per_family = evaluation.get("per_family", [])
    if not per_family:
        return

    df = pd.DataFrame(per_family)
    df = df.sort_values("recall_at_threshold", ascending=True)

    fig, ax = plt.subplots(figsize=(10, max(6, len(df) * 0.35)))

    colors = [COLORS["attack"] if not row.get("seen_in_training", True) else COLORS["benign"]
              for _, row in df.iterrows()]
    bars = ax.barh(df["family"], df["recall_at_threshold"], color=colors, alpha=0.8, edgecolor="black")

    for bar, row in zip(bars, df.itertuples()):
        label = f"{row.recall_at_threshold:.2%}"
        if hasattr(row, "seen_in_training") and not row.seen_in_training:
            label += " ★ (unseen)"
        ax.text(bar.get_width() + 0.01, bar.get_y() + bar.get_height()/2,
                label, va="center", fontsize=9)

    ax.set_xlabel("Recall at Global Threshold")
    ax.set_title("Per-Attack-Family Recall (★ = unseen during training)")
    ax.set_xlim(0, 1.15)
    ax.grid(True, alpha=0.3, axis="x")

    # Legend
    from matplotlib.patches import Patch
    legend_elements = [
        Patch(facecolor=COLORS["attack"], label="Unseen in training (zero-day)"),
        Patch(facecolor=COLORS["benign"], label="Seen in training"),
    ]
    ax.legend(handles=legend_elements, loc="lower right")

    plt.tight_layout()
    plt.savefig(out_dir / "per_family_recall.png", bbox_inches="tight")
    plt.close()


def plot_score_distributions(evaluation: dict[str, Any], artifact_dir: Path, out_dir: Path) -> None:
    """Plot score distributions for benign vs attack using saved OOF scores."""
    oof_data = load_oof_scores(artifact_dir)
    if not oof_data:
        return

    oof_proba, y = oof_data
    benign_scores = oof_proba[y == 0]
    attack_scores = oof_proba[y == 1]

    if len(benign_scores) == 0 or len(attack_scores) == 0:
        return

    fig, axes = plt.subplots(1, 2, figsize=(14, 5))

    # Histogram
    ax = axes[0]
    ax.hist(benign_scores, bins=50, alpha=0.5, label="Benign", color=COLORS["benign"], density=True)
    ax.hist(attack_scores, bins=50, alpha=0.5, label="Attack", color=COLORS["attack"], density=True)
    op = evaluation.get("operating_point", {})
    if op:
        ax.axvline(op["threshold"], color=COLORS["threshold"], linestyle="--", linewidth=2,
                   label=f'Threshold = {op["threshold"]:.2e}')
    ax.set_xlabel("Attack Probability")
    ax.set_ylabel("Density")
    ax.set_title("Score Distributions (Out-of-Fold)")
    ax.set_yscale("log")
    ax.legend()
    ax.grid(True, alpha=0.3)

    # CDF
    ax = axes[1]
    benign_sorted = np.sort(benign_scores)
    attack_sorted = np.sort(attack_scores)
    benign_cdf = np.arange(1, len(benign_sorted) + 1) / len(benign_sorted)
    attack_cdf = np.arange(1, len(attack_sorted) + 1) / len(attack_sorted)
    ax.plot(benign_sorted, benign_cdf, label="Benign", color=COLORS["benign"], linewidth=2)
    ax.plot(attack_sorted, attack_cdf, label="Attack", color=COLORS["attack"], linewidth=2)
    if op:
        ax.axvline(op["threshold"], color=COLORS["threshold"], linestyle="--", linewidth=2,
                   label=f'Threshold = {op["threshold"]:.2e}')
    ax.set_xlabel("Attack Probability")
    ax.set_ylabel("CDF")
    ax.set_title("Cumulative Score Distributions")
    ax.set_xscale("log")
    ax.legend()
    ax.grid(True, alpha=0.3)

    plt.tight_layout()
    plt.savefig(out_dir / "score_distributions.png", bbox_inches="tight")
    plt.close()


def generate_all_graphs(artifact_dir: Path, out_dir: Path | None = None) -> None:
    """Generate all evaluation graphs from artifact directory."""
    out_dir = out_dir or artifact_dir / "graphs"
    out_dir.mkdir(parents=True, exist_ok=True)

    evaluation = load_evaluation(artifact_dir)

    print(f"[*] Generating graphs in {out_dir}")

    print("  - ROC/PR curves...")
    plot_roc_pr_curves(evaluation, out_dir)

    print("  - FPR/Recall tradeoff...")
    plot_fpr_recall_tradeoff(evaluation, out_dir)

    print("  - Per-fold metrics...")
    plot_fold_metrics(evaluation, out_dir)

    print("  - Confusion matrix...")
    plot_confusion_matrix(evaluation, out_dir)

    print("  - Stage 1 ablation...")
    plot_stage1_ablation(evaluation, out_dir)

    print("  - Feature importance...")
    plot_feature_importance(artifact_dir, out_dir)

    print("  - Per-family recall...")
    plot_per_family_recall(evaluation, artifact_dir, out_dir)

    print("  - Score distributions...")
    plot_score_distributions(evaluation, artifact_dir, out_dir)

    print(f"[✓] All graphs saved to {out_dir}")


def main() -> None:
    import argparse
    parser = argparse.ArgumentParser(description="Generate evaluation graphs for SignSight NIDS")
    parser.add_argument("--artifact-dir", default="model/artifacts", help="Directory with evaluation.json and feature_importance.csv")
    parser.add_argument("--out-dir", default=None, help="Output directory for graphs (default: artifact_dir/graphs)")
    args = parser.parse_args()

    artifact_dir = Path(args.artifact_dir)
    out_dir = Path(args.out_dir) if args.out_dir else None

    generate_all_graphs(artifact_dir, out_dir)


if __name__ == "__main__":
    main()