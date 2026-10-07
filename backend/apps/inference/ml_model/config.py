"""Central configuration for the SignSight two-stage NIDS model.

Every tunable lives here so that training, evaluation and inference all agree on
a single source of truth.  The config is a plain dataclass tree, which makes it
trivially serialisable into the model card that ships next to the artefact.
"""

from __future__ import annotations

import re
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Literal

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DATA_DIR = PROJECT_ROOT / "datasets" / "cicimp"
DEFAULT_ARTIFACT_DIR = PROJECT_ROOT / "model" / "artifacts"

# ---------------------------------------------------------------- dataset ---
# CICIDS2017-improved is captured one working day per file.  Each day contains a
# disjoint set of attack families, which is exactly why we evaluate with
# leave-one-day-out (LODO) cross validation instead of a random split.
DAY_FILES: dict[str, str] = {
    "mon": "monday.csv",
    "tue": "tuesday.csv",
    "wed": "wednesday.csv",
    "thu": "thursday.csv",
    "fri": "friday.csv",
}
ALL_DAYS: tuple[str, ...] = tuple(DAY_FILES)

#: Columns that identify a specific capture rather than describing the traffic.
#: ``id``/``Flow ID``/IPs are near-unique per flow and would let the model
#: memorise the pcap instead of learning traffic behaviour.  ``Timestamp`` is
#: replaced by calendar features in :mod:`model.data`.
IDENTIFIER_COLUMNS: tuple[str, ...] = ("id", "Flow ID", "Src IP", "Dst IP", "Timestamp")

#: Supervised fields.  ``Attempted Category`` is a *label* in disguise -- keeping
#: it would leak the ground truth straight into the feature matrix.
LABEL_COLUMNS: tuple[str, ...] = ("Label", "Attempted Category")

BENIGN_LABEL = "BENIGN"
ATTEMPTED_SUFFIX = "- Attempted"

SplitStrategy = Literal["lodo", "holdout", "random"]


# ----------------------------------------------------------------- stages ---
@dataclass
class IsolationForestConfig:
    """Stage 1 - unsupervised outlier detector fitted on benign traffic only."""

    n_estimators: int = 300
    max_samples: int | str = 256
    contamination: float = 0.01
    max_features: float = 1.0
    bootstrap: bool = False
    random_state: int = 42
    n_jobs: int = -1


@dataclass
class LightGBMConfig:
    """Stage 2 - supervised gradient boosted trees over flow features + anomaly."""

    n_estimators: int = 700
    learning_rate: float = 0.05
    num_leaves: int = 63
    max_depth: int = -1
    min_child_samples: int = 100
    min_split_gain: float = 0.0
    subsample: float = 0.9
    subsample_freq: int = 1
    colsample_bytree: float = 0.8
    reg_alpha: float = 0.0
    reg_lambda: float = 1.0
    max_bin: int = 255
    random_state: int = 42
    n_jobs: int = -1
    verbosity: int = -1

    def as_params(self) -> dict:
        return asdict(self)


@dataclass
class NIDSConfig:
    """Top level model + pipeline configuration."""

    # Operating constraint.  The whole point of this project is that a SOC can
    # only tolerate a very small share of benign flows being escalated.
    max_fpr: float = 0.001
    # Statistical guard: pick the threshold so the *Wilson upper bound* of the
    # observed FPR stays inside budget, not just the point estimate.
    fpr_confidence: float = 0.95
    random_state: int = 42

    data_dir: Path = DEFAULT_DATA_DIR
    artifact_dir: Path = DEFAULT_ARTIFACT_DIR

    include_attempted: bool = True
    build_attack_family_head: bool = True

    stage1: IsolationForestConfig = field(default_factory=IsolationForestConfig)
    stage2: LightGBMConfig = field(default_factory=LightGBMConfig)

    model_name: str = "signsight-hybrid-if-lgbm"
    version: str = "1.0.0"

    def to_dict(self) -> dict:
        out = asdict(self)
        out["data_dir"] = str(self.data_dir)
        out["artifact_dir"] = str(self.artifact_dir)
        return out


_IDENT_RE = re.compile(r"[^0-9a-zA-Z]+")


def sanitize_feature_name(name: str) -> str:
    """Turn a raw CIC header into a safe, readable LightGBM feature name."""
    return _IDENT_RE.sub("_", str(name).strip()).strip("_").lower()