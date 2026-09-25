"""Feature engineering for the Sign-Sight ML pipeline.

Transforms raw NSL-KDD DataFrames into model-ready feature matrices.
Design decisions:
  - One-hot encode the 3 categorical features (protocol_type, service, flag).
  - StandardScaler on numeric features.
  - Return X (numpy array) and y (numpy array of category labels).
  - Fit the encoder/scaler on training data, transform on test data
    (classic fit_transform / transform split to prevent data leakage).
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np
import pandas as pd
from numpy.typing import NDArray
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from sign_sight.constants import CATEGORICAL_FEATURES, NUMERIC_FEATURES


@dataclass
class FeatureMatrix:
    """Container for processed feature data."""

    X: NDArray[np.float64]
    y: NDArray[np.str_]
    feature_names: list[str]
    preprocessor: ColumnTransformer


def build_preprocessor() -> ColumnTransformer:
    """Build the sklearn ColumnTransformer for NSL-KDD features.

    Returns:
        Unfitted ColumnTransformer ready for fit_transform.
    """
    return ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), NUMERIC_FEATURES),
            (
                "cat",
                OneHotEncoder(handle_unknown="ignore", sparse_output=False),
                CATEGORICAL_FEATURES,
            ),
        ],
        remainder="drop",
    )


def build_feature_matrix(
    df: pd.DataFrame,
    *,
    preprocessor: ColumnTransformer | None = None,
    fit: bool = True,
) -> FeatureMatrix:
    """Transform a raw DataFrame into a model-ready feature matrix.

    Args:
        df: DataFrame from a loader (must have feature columns + 'category').
        preprocessor: Optional pre-fitted ColumnTransformer. If None, a new
            one is created.
        fit: If True, fit_transform the preprocessor. If False, only
            transform (use this for test/inference data).

    Returns:
        FeatureMatrix with X, y, feature names, and the preprocessor.

    Raises:
        KeyError: If 'category' column is missing from df.
    """
    if "category" not in df.columns:
        msg = "DataFrame must contain a 'category' column"
        raise KeyError(msg)

    y = df["category"].to_numpy()

    if preprocessor is None:
        preprocessor = build_preprocessor()

    if fit:
        X = preprocessor.fit_transform(df)
    else:
        X = preprocessor.transform(df)

    # Build feature names from the fitted transformer
    feature_names: list[str] = []
    for name, transformer, columns in preprocessor.transformers_:
        if name == "num":
            feature_names.extend(columns)
        elif name == "cat" and hasattr(transformer, "get_feature_names_out"):
            feature_names.extend(transformer.get_feature_names_out(columns).tolist())

    return FeatureMatrix(
        X=X,
        y=y,
        feature_names=feature_names,
        preprocessor=preprocessor,
    )
