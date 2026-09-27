"""Tests for sign_sight.ingest.loader."""
from __future__ import annotations

from pathlib import Path

import pandas as pd
import pytest

from sign_sight.constants import LABEL_ORDER
from sign_sight.ingest.loader import load_nsl_kdd


def test_load_nsl_kdd_file_not_found() -> None:
    with pytest.raises(FileNotFoundError):
        load_nsl_kdd("nonexistent.csv")


def test_load_nsl_kdd_produces_category_column(
    tmp_path: Path, sample_nsl_kdd_df: pd.DataFrame
) -> None:
    """Write synthetic data to a file and load it back."""
    file_path = tmp_path / "test_data.csv"
    sample_nsl_kdd_df.to_csv(file_path, header=False, index=False)
    
    result_df = load_nsl_kdd(file_path)
    
    assert "category" in result_df.columns
    assert "label" not in result_df.columns


def test_category_values_are_from_label_order(
    sample_nsl_kdd_df: pd.DataFrame,
) -> None:
    """Verify that mapped categories are within the expected set."""
    from sign_sight.constants import NSL_KDD_CATEGORY_MAP

    all_categories = set(NSL_KDD_CATEGORY_MAP.values())
    expected = set(LABEL_ORDER)
    assert all_categories == expected
