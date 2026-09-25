"""Tests for sign_sight.models.trainer."""
from __future__ import annotations

from pathlib import Path

import numpy as np
import pytest
from sklearn.ensemble import RandomForestClassifier

from sign_sight.models.trainer import (
    EvaluationReport,
    evaluate_model,
    load_model,
    save_model,
    train_model,
)


@pytest.fixture()
def simple_dataset() -> tuple:
    """Create a simple synthetic dataset for model tests."""
    rng = np.random.default_rng(42)
    X = rng.standard_normal((200, 10))
    y = rng.choice(["NORMAL", "DOS", "PROBE"], size=200, p=[0.6, 0.25, 0.15])
    return X[:150], X[150:], y[:150], y[150:]


def test_train_model_returns_fitted_classifier(simple_dataset: tuple) -> None:
    X_train, _, y_train, _ = simple_dataset
    clf = train_model(X_train, y_train, n_estimators=10)
    assert isinstance(clf, RandomForestClassifier)
    assert hasattr(clf, "classes_")


def test_evaluate_model_returns_report(simple_dataset: tuple) -> None:
    X_train, X_test, y_train, y_test = simple_dataset
    clf = train_model(X_train, y_train, n_estimators=10)
    report = evaluate_model(clf, X_test, y_test)

    assert isinstance(report, EvaluationReport)
    assert "NORMAL" in report.classification_report_dict
    assert report.confusion_matrix.shape[0] == len(clf.classes_)
    assert isinstance(report.macro_auc, float)
    assert isinstance(report.false_positive_rate, dict)


def test_save_and_load_model(simple_dataset: tuple, tmp_path: Path) -> None:
    X_train, _, y_train, _ = simple_dataset
    clf = train_model(X_train, y_train, n_estimators=10)

    model_path = tmp_path / "test_model.joblib"
    saved_path = save_model(clf, model_path)
    assert saved_path.exists()

    loaded = load_model(saved_path)
    assert isinstance(loaded, RandomForestClassifier)
    # Predictions should match
    np.testing.assert_array_equal(clf.predict(X_train[:5]), loaded.predict(X_train[:5]))


def test_load_model_file_not_found() -> None:
    with pytest.raises(FileNotFoundError):
        load_model("nonexistent.joblib")
