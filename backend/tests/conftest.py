"""Shared test fixtures for the sign_sight ML pipeline tests."""
from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from sign_sight.constants import CATEGORICAL_FEATURES, NSL_KDD_COLUMNS


@pytest.fixture()
def sample_nsl_kdd_df() -> pd.DataFrame:
    """Create a minimal synthetic NSL-KDD-shaped DataFrame for testing."""
    rng = np.random.default_rng(42)
    n_rows = 100
    data: dict[str, list] = {}

    for col in NSL_KDD_COLUMNS:
        if col in CATEGORICAL_FEATURES:
            if col == "protocol_type":
                data[col] = rng.choice(["tcp", "udp", "icmp"], size=n_rows).tolist()
            elif col == "service":
                data[col] = rng.choice(["http", "ftp", "smtp", "ssh"], size=n_rows).tolist()
            elif col == "flag":
                data[col] = rng.choice(["SF", "S0", "REJ"], size=n_rows).tolist()
        elif col == "label":
            data[col] = rng.choice(
                ["normal", "neptune", "smurf", "satan", "ipsweep", "buffer_overflow"],
                size=n_rows,
                p=[0.5, 0.15, 0.1, 0.1, 0.1, 0.05],
            ).tolist()
        elif col == "difficulty_level":
            data[col] = rng.integers(1, 22, size=n_rows).tolist()
        else:
            data[col] = rng.uniform(0, 1000, size=n_rows).tolist()

    return pd.DataFrame(data)
