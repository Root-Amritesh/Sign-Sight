"""Tests for sign_sight.features.engineer."""
from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from sign_sight.features.engineer import FeatureMatrix, build_feature_matrix


def test_build_feature_matrix_returns_correct_type(
    sample_nsl_kdd_df: pd.DataFrame,
) -> None:
    from sign_sight.constants import NSL_KDD_CATEGORY_MAP
    df = sample_nsl_kdd_df.copy()
    df["category"] = df["label"].str.strip().str.lower().map(NSL_KDD_CATEGORY_MAP).fillna("UNKNOWN")
    df = df.drop(columns=["label", "difficulty_level"])

    result = build_feature_matrix(df, fit=True)

    assert isinstance(result, FeatureMatrix)
    assert result.X.shape[0] == len(df)
    assert len(result.y) == len(df)
    assert len(result.feature_names) > 0


def test_build_feature_matrix_raises_without_category() -> None:
    df = pd.DataFrame({"a": [1, 2], "b": [3, 4]})
    with pytest.raises(KeyError, match="category"):
        build_feature_matrix(df)


def test_transform_only_uses_fitted_preprocessor(
    sample_nsl_kdd_df: pd.DataFrame,
) -> None:
    from sign_sight.constants import NSL_KDD_CATEGORY_MAP
    df = sample_nsl_kdd_df.copy()
    df["category"] = df["label"].str.strip().str.lower().map(NSL_KDD_CATEGORY_MAP).fillna("UNKNOWN")
    df = df.drop(columns=["label", "difficulty_level"])

    # Split
    train_df = df.iloc[:80]
    test_df = df.iloc[80:]

    train_result = build_feature_matrix(train_df, fit=True)
    test_result = build_feature_matrix(
        test_df, preprocessor=train_result.preprocessor, fit=False
    )

    assert test_result.X.shape[0] == len(test_df)
    assert test_result.X.shape[1] == train_result.X.shape[1]
