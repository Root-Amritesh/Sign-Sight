"""Operating-point selection for an FPR-constrained SOC detector.

A production IDS is not allowed to pick ``argmax`` or a 0.5 cut-off: the SOC
budget is expressed as a *false positive rate*, and we have to find the
probabilistic threshold that spends that budget on the most recall possible.

Two refinements over a naive "lowest threshold that satisfies FPR":

1. **Wilson upper bound.** The empirical FPR on a few hundred thousand benign
   flows is itself a noisy estimate.  We require the upper 95% confidence bound
   of the observed FPR to fit inside the budget, so the constraint holds for
   unseen traffic rather than only for the validation sample.

2. **Tie-breaking on recall, then on separation.**  Among all candidate
   thresholds that satisfy the budget we maximise recall; ties are broken by
   the largest gap between the neighbouring benign/attack score quantiles.
"""

from __future__ import annotations


from dataclasses import dataclass

import numpy as np
from scipy import stats


@dataclass(frozen=True)
class OperatingPoint:
    """A validated alert threshold plus the budget arithmetic behind it."""

    threshold: float
    fpr: float
    fpr_upper_bound: float
    recall: float
    precision: float
    tp: int
    fp: int
    fn: int
    tn: int
    n_benign: int
    n_attack: int
    confidence: float
    alerts_per_10k_flows: float

    def to_dict(self) -> dict:
        return {
            "threshold": self.threshold,
            "fpr": self.fpr,
            "fpr_upper_bound_95": self.fpr_upper_bound,
            "recall": self.recall,
            "precision": self.precision,
            "tp": self.tp,
            "fp": self.fp,
            "fn": self.fn,
            "tn": self.tn,
            "n_benign_evaluated": self.n_benign,
            "n_attack_evaluated": self.n_attack,
            "confidence": self.confidence,
            "alerts_per_10k_flows": self.alerts_per_10k_flows,
        }


def _z_for(confidence: float) -> float:
    """Two-sided normal quantile for the requested confidence level."""
    return float(stats.norm.ppf(0.5 + confidence / 2.0))


def wilson_upper_bound(successes, trials: int, confidence: float = 0.95):
    """Upper Wilson score interval bound for a binomial proportion.

    Accepts scalars or arrays for ``successes`` - the vectorised path matters
    because the threshold search evaluates this once per candidate cut, which on
    a 2M-flow corpus is a seven-figure number of calls.
    """
    if trials <= 0:
        return np.ones_like(np.asarray(successes, dtype=np.float64)) if np.ndim(successes) else 1.0
    successes = np.asarray(successes, dtype=np.float64)
    z = _z_for(confidence)
    p = successes / trials
    denom = 1.0 + z * z / trials
    centre = p + z * z / (2.0 * trials)
    margin = z * np.sqrt(p * (1.0 - p) / trials + z * z / (4.0 * trials * trials))
    return np.minimum(1.0, (centre + margin) / denom)


def select_threshold(
    y_true: np.ndarray,
    scores: np.ndarray,
    max_fpr: float,
    confidence: float = 0.95,
    min_alerts: int = 1,
) -> OperatingPoint:
    """Highest-recall threshold whose *upper bound* FPR stays within ``max_fpr``.

    Parameters
    ----------
    y_true:
        0 = benign, 1 = attack.  Any non-zero value is treated as an attack so
        that callers may pass raw integer labels.
    scores:
        Attack probability from stage 2, aligned with ``y_true``.
    max_fpr:
        Hard budget, e.g. ``0.001`` for one false alarm per thousand benign flows.
    min_alerts:
        Reject degenerate solutions that would flag essentially nothing; such a
        model is useless to a SOC even if it "meets" the FPR budget.
    """
    y_true = np.asarray(y_true).astype(np.int8).ravel()
    scores = np.asarray(scores, dtype=np.float64).ravel()
    if scores.shape != y_true.shape:
        raise ValueError("scores and y_true must have the same length")

    benign_mask = y_true == 0
    attack_mask = ~benign_mask
    n_benign = int(benign_mask.sum())
    n_attack = int(attack_mask.sum())
    if n_benign == 0 or n_attack == 0:
        raise ValueError(
            f"threshold search needs both classes (benign={n_benign}, attack={n_attack})"
        )

    # Every distinct observed score is a candidate cut: each one maps to a
    # unique (FP, TP) pair, so scanning them is exact rather than a grid
    # approximation. We alert when ``score >= cut``.
    candidates = np.unique(scores)
    cuts = np.unique(np.concatenate([[0.0], candidates, [1.0 + np.nextafter(0.0, 1.0)]]))
    cuts = cuts[(cuts >= 0.0) & (cuts <= 1.0)]
    if cuts[0] > 0.0:
        cuts = np.concatenate([[0.0], cuts])

    # Count of each class scoring at or above each cut, index-aligned with
    # ``cuts``. ``side="left"`` counts scores strictly below the cut, so the
    # complement is exactly ``score >= cut``. Using "right" here would drop the
    # ties sitting exactly on the cut and under-count alerts.
    tp_curve = n_attack - np.searchsorted(
        np.sort(scores[attack_mask]), cuts, side="left"
    )
    fp_curve = n_benign - np.searchsorted(
        np.sort(scores[benign_mask]), cuts, side="left"
    )

    fpr = fp_curve / n_benign
    fpr_ub = wilson_upper_bound(fp_curve, n_benign, confidence)
    recall = tp_curve / n_attack
    total_alerts = tp_curve + fp_curve

    feasible = (fpr_ub <= max_fpr) & (total_alerts >= min_alerts)
    if not feasible.any():
        # Budget is unreachable with this scorer: fall back to the strictest
        # cut available and let the caller see the (violated) numbers.
        idx = int(np.argmin(fpr_ub))
        feasible = np.zeros_like(feasible)
        feasible[idx] = True

    feasible_idx = np.flatnonzero(feasible)
    # Maximise recall first; break ties by maximising total alert volume, which
    # prefers the loosest still-feasible cut and therefore catches the most
    # attacks without spending more of the FPR budget.
    order = np.lexsort((-total_alerts[feasible_idx], -tp_curve[feasible_idx]))
    best = int(feasible_idx[order[0]])

    tp, fp = int(tp_curve[best]), int(fp_curve[best])
    fn, tn = n_attack - tp, n_benign - fp
    precision = tp / (tp + fp) if (tp + fp) else 0.0
    return OperatingPoint(
        threshold=float(cuts[best]),
        fpr=float(fp / n_benign),
        fpr_upper_bound=float(fpr_ub[best]),
        recall=float(tp / n_attack),
        precision=float(precision),
        tp=tp,
        fp=fp,
        fn=fn,
        tn=tn,
        n_benign=n_benign,
        n_attack=n_attack,
        confidence=confidence,
        alerts_per_10k_flows=float((tp + fp) / (n_benign + n_attack) * 10_000.0),
    )


def recall_at_fpr(
    y_true: np.ndarray, scores: np.ndarray, fpr_grid: np.ndarray | None = None
) -> list[dict]:
    """Recall achievable at a ladder of FPR budgets (model-selection curve)."""
    if fpr_grid is None:
        fpr_grid = np.array(
            [0.0001, 0.0005, 0.001, 0.005, 0.01, 0.05, 0.10, 0.25, 0.50, 1.00]
        )
    return [
        select_threshold(y_true, scores, max_fpr=float(budget)).to_dict()
        for budget in fpr_grid
    ]