"""Model training and evaluation for Sign-Sight.

Design decisions:
  - RandomForestClassifier with class_weight='balanced' to handle
    class imbalance without resampling (simpler, fewer hyperparameters).
  - Evaluation reports precision, recall, FPR, and AUC — not just accuracy.
    This is a non-negotiable requirement from the challenge brief.
  - Model persistence via joblib.
  - NO enforcement actions anywhere in this module.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import joblib
import numpy as np
from numpy.typing import NDArray
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    roc_auc_score,
)

from sign_sight.constants import LABEL_ORDER


@dataclass
class EvaluationReport:
    """Structured evaluation metrics for a trained model."""

    classification_report_dict: dict[str, Any]
    confusion_matrix: NDArray[np.int64]
    per_class_auc: dict[str, float]
    macro_auc: float
    false_positive_rate: dict[str, float]
    accuracy: float
    notes: str = ""


def train_model(
    X_train: NDArray[np.float64],
    y_train: NDArray[np.str_],
    *,
    n_estimators: int = 200,
    random_state: int = 42,
    **rf_kwargs: Any,
) -> RandomForestClassifier:
    """Train a RandomForestClassifier with balanced class weights.

    Args:
        X_train: Training feature matrix.
        y_train: Training labels (coarse category strings).
        n_estimators: Number of trees.
        random_state: Random seed for reproducibility.
        **rf_kwargs: Additional keyword args passed to RandomForestClassifier.

    Returns:
        Fitted RandomForestClassifier.
    """
    clf = RandomForestClassifier(
        n_estimators=n_estimators,
        class_weight="balanced",
        random_state=random_state,
        n_jobs=-1,
        **rf_kwargs,
    )
    clf.fit(X_train, y_train)
    return clf


def evaluate_model(
    clf: RandomForestClassifier,
    X_test: NDArray[np.float64],
    y_test: NDArray[np.str_],
) -> EvaluationReport:
    """Evaluate a classifier with enterprise-grade metrics.

    Reports precision, recall, F1 per class, macro/weighted averages,
    confusion matrix, per-class AUC (one-vs-rest), and per-class FPR.
    Accuracy is reported but NOT used as the primary metric.

    Args:
        clf: Fitted classifier.
        X_test: Test feature matrix.
        y_test: Test labels.

    Returns:
        EvaluationReport with all metrics.
    """
    y_pred = clf.predict(X_test)
    y_proba = clf.predict_proba(X_test)

    # Classification report as dict
    report_dict = classification_report(
        y_test, y_pred, target_names=clf.classes_.tolist(), output_dict=True
    )

    # Confusion matrix
    cm = confusion_matrix(y_test, y_pred, labels=clf.classes_)

    # Per-class FPR from confusion matrix
    fpr_per_class: dict[str, float] = {}
    for i, label in enumerate(clf.classes_):
        # FP = sum of column i minus true positives (diagonal)
        fp = cm[:, i].sum() - cm[i, i]
        # TN + FP = total samples not in this class
        tn_plus_fp = cm.sum() - cm[i, :].sum()
        fpr_per_class[label] = float(fp / tn_plus_fp) if tn_plus_fp > 0 else 0.0

    # Per-class AUC (one-vs-rest)
    per_class_auc: dict[str, float] = {}
    try:
        for i, label in enumerate(clf.classes_):
            y_binary = (y_test == label).astype(int)
            if y_binary.sum() == 0 or y_binary.sum() == len(y_binary):
                per_class_auc[label] = float("nan")
            else:
                per_class_auc[label] = float(
                    roc_auc_score(y_binary, y_proba[:, i])
                )
        valid_aucs = [v for v in per_class_auc.values() if not np.isnan(v)]
        macro_auc = float(np.mean(valid_aucs)) if valid_aucs else float("nan")
    except ValueError:
        per_class_auc = {label: float("nan") for label in clf.classes_}
        macro_auc = float("nan")

    accuracy = float(report_dict.get("accuracy", 0.0))

    return EvaluationReport(
        classification_report_dict=report_dict,
        confusion_matrix=cm,
        per_class_auc=per_class_auc,
        macro_auc=macro_auc,
        false_positive_rate=fpr_per_class,
        accuracy=accuracy,
        notes="class_weight='balanced' used to handle class imbalance.",
    )


def save_model(
    clf: RandomForestClassifier,
    path: str | Path,
) -> Path:
    """Persist a trained model to disk via joblib.

    Args:
        clf: Fitted classifier.
        path: File path to save to (should end in .joblib).

    Returns:
        Resolved Path to the saved artifact.
    """
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(clf, path)
    return path.resolve()


def load_model(path: str | Path) -> RandomForestClassifier:
    """Load a persisted model from disk.

    Args:
        path: Path to the .joblib file.

    Returns:
        The deserialized classifier.

    Raises:
        FileNotFoundError: If the path does not exist.
    """
    path = Path(path)
    if not path.exists():
        msg = f"Model artifact not found: {path}"
        raise FileNotFoundError(msg)
    return joblib.load(path)
