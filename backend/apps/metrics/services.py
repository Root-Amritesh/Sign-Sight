"""Drift detection logic, distribution comparison.

This module computes concept drift between the training distribution
and the current prediction distribution using Jensen-Shannon divergence.
"""
import logging
import numpy as np
from .models import DriftSnapshot, PredictionDistribution

logger = logging.getLogger(__name__)


def compute_drift(training_dist: dict, current_dist: dict) -> float:
    """Compute Jensen-Shannon divergence between two label distributions.
    
    Both dicts map label names to proportions (must sum to ~1.0).
    Returns a float in [0, 1] where 0 = identical, 1 = maximally different.
    """
    all_labels = sorted(set(list(training_dist.keys()) + list(current_dist.keys())))
    p = np.array([training_dist.get(l, 0.0) for l in all_labels], dtype=float)
    q = np.array([current_dist.get(l, 0.0) for l in all_labels], dtype=float)

    # Normalise
    p = p / (p.sum() or 1.0)
    q = q / (q.sum() or 1.0)

    m = 0.5 * (p + q)

    def kl(a, b):
        mask = a > 0
        return np.sum(a[mask] * np.log(a[mask] / b[mask]))

    return float(0.5 * kl(p, m) + 0.5 * kl(q, m))


def record_drift_snapshot(model_version: str, training_dist: dict,
                          current_dist: dict, threshold: float = 0.1) -> DriftSnapshot:
    """Compute and persist a drift snapshot."""
    score = compute_drift(training_dist, current_dist)
    snapshot = DriftSnapshot.objects.create(
        drift_score=score,
        training_distribution=training_dist,
        current_distribution=current_dist,
        threshold_used=threshold,
        model_version=model_version,
    )
    if score > threshold:
        logger.warning("Drift detected: %.4f > %.4f for model %s", score, threshold, model_version)
    return snapshot
