"""SignSight ML NIDS - a two-stage hybrid intrusion detector.

    Isolation Forest (benign-only, unsupervised)  ->  anomaly score
    LightGBM (supervised, flows + anomaly score)   ->  P(attack)

Quick start::

    python -m model.train          # LODO evaluation + writes model/artifacts/
    python -m model.infer --input flows.csv
"""

from .config import NIDSConfig
from .pipeline import ALERT_SCHEMA, HybridNIDSModel, SOCAlert
from .thresholds import OperatingPoint, select_threshold

__all__ = [
    "NIDSConfig",
    "HybridNIDSModel",
    "SOCAlert",
    "ALERT_SCHEMA",
    "OperatingPoint",
    "select_threshold",
]

__version__ = "1.0.0"