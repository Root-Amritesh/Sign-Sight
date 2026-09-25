"""Dataset loaders for Sign-Sight.

Each loader returns a pandas DataFrame with consistent column naming
and a 'category' column containing coarse attack labels from LABEL_ORDER.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any

import pandas as pd

from sign_sight.constants import NSL_KDD_CATEGORY_MAP, NSL_KDD_COLUMNS


def load_nsl_kdd(
    path: str | Path,
    *,
    include_difficulty: bool = False,
) -> pd.DataFrame:
    """Load an NSL-KDD .csv or .txt file and return a cleaned DataFrame.

    The NSL-KDD files (KDDTrain+.txt, KDDTest+.txt) are headerless CSVs.
    This loader:
      1. Reads the file with the canonical 43-column header.
      2. Maps the fine-grained 'label' column to coarse 5-class 'category'.
      3. Drops the 'difficulty_level' column unless include_difficulty=True.
      4. Drops the original 'label' column (replaced by 'category').

    Args:
        path: Path to the NSL-KDD data file.
        include_difficulty: If True, keep the difficulty_level column.

    Returns:
        DataFrame with 41 feature columns + 'category'.

    Raises:
        FileNotFoundError: If the path does not exist.
        ValueError: If the file has an unexpected number of columns.
    """
    path = Path(path)
    if not path.exists():
        msg = f"Dataset file not found: {path}"
        raise FileNotFoundError(msg)

    df = pd.read_csv(path, header=None, names=NSL_KDD_COLUMNS)

    if len(df.columns) != len(NSL_KDD_COLUMNS):
        msg = (
            f"Expected {len(NSL_KDD_COLUMNS)} columns, "
            f"got {len(df.columns)} in {path}"
        )
        raise ValueError(msg)

    # Map fine-grained labels → coarse categories
    df["category"] = (
        df["label"]
        .str.strip()
        .str.lower()
        .map(NSL_KDD_CATEGORY_MAP)
        .fillna("UNKNOWN")
    )

    # Clean up
    df = df.drop(columns=["label"])
    if not include_difficulty:
        df = df.drop(columns=["difficulty_level"], errors="ignore")

    return df
