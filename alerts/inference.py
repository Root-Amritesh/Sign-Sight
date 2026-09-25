"""ML ↔ Django inference bridge.

This module connects the sign_sight ML pipeline to the Django alerts app.
It handles model loading, prediction, and severity computation.

Design constraints:
  - NO enforcement actions. No blocking, no firewall calls, no packet drops.
  - The only side effect is creating Alert records.
  - Must work standalone (for testing without the full ML pipeline).
"""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)


def load_model(path: str | Path) -> Any:
    """Load a trained model from disk via joblib.

    Args:
        path: Path to the .joblib model artifact.

    Returns:
        The deserialized sklearn classifier.

    Raises:
        FileNotFoundError: If the model file does not exist.
    """
    import joblib

    path = Path(path)
    if not path.exists():
        msg = f"Model artifact not found: {path}"
        raise FileNotFoundError(msg)
    return joblib.load(path)


def compute_severity(category: str, confidence: float) -> str:
    """Compute alert severity from attack category and confidence.

    Severity is an operational concept — how urgently should the analyst
    look at this? — not a model output. U2R (privilege escalation) is
    always higher severity than PROBE (scanning) at the same confidence.

    Mapping:
        | Category | conf ≥ 0.9 | conf ≥ 0.7 | conf ≥ 0.5 | < 0.5  |
        |----------|------------|------------|------------|--------|
        | U2R      | CRITICAL   | CRITICAL   | HIGH       | MEDIUM |
        | R2L      | CRITICAL   | HIGH       | MEDIUM     | LOW    |
        | DOS      | HIGH       | HIGH       | MEDIUM     | LOW    |
        | PROBE    | HIGH       | MEDIUM     | LOW        | LOW    |
        | NORMAL   | —          | —          | —          | —      |

    Args:
        category: Coarse attack category (NORMAL, DOS, PROBE, R2L, U2R).
        confidence: Classifier confidence (0.0–1.0).

    Returns:
        Severity string: LOW, MEDIUM, HIGH, or CRITICAL.
    """
    if category == "NORMAL":
        return "LOW"

    # Severity matrix indexed by (category, confidence_tier)
    severity_map: dict[str, dict[str, str]] = {
        "U2R": {"high": "CRITICAL", "med_high": "CRITICAL", "med": "HIGH", "low": "MEDIUM"},
        "R2L": {"high": "CRITICAL", "med_high": "HIGH", "med": "MEDIUM", "low": "LOW"},
        "DOS": {"high": "HIGH", "med_high": "HIGH", "med": "MEDIUM", "low": "LOW"},
        "PROBE": {"high": "HIGH", "med_high": "MEDIUM", "med": "LOW", "low": "LOW"},
    }

    if confidence >= 0.9:
        tier = "high"
    elif confidence >= 0.7:
        tier = "med_high"
    elif confidence >= 0.5:
        tier = "med"
    else:
        tier = "low"

    category_map = severity_map.get(category, severity_map["PROBE"])
    return category_map[tier]


def predict(features: dict[str, Any], model: Any) -> dict[str, Any]:
    """Run inference on a feature vector.

    This function prepares the features for the model and returns a
    structured prediction result. In the current scaffolding, it returns
    a placeholder — the real implementation will use the sign_sight
    pipeline's preprocessor to transform features.

    Args:
        features: Dict of NSL-KDD feature names to values.
        model: A fitted sklearn classifier with predict() and predict_proba().

    Returns:
        Dict with keys: category (str), confidence (float), is_attack (bool).

    Note:
        This function does NOT create alerts or take any enforcement action.
        Alert creation is the caller's responsibility (in views.py).
    """
    # TODO: Replace with real pipeline integration (Step 4)
    # Real implementation will:
    #   1. Build a DataFrame from features
    #   2. Transform with the saved preprocessor
    #   3. Call model.predict() and model.predict_proba()

    import numpy as np
    import pandas as pd

    try:
        # Attempt real prediction if model has the right interface
        df = pd.DataFrame([features])
        category = str(model.predict(df)[0])
        proba = model.predict_proba(df)[0]
        confidence = float(np.max(proba))
    except Exception:
        logger.warning("Model prediction failed — returning placeholder. Wire up the real pipeline.")
        category = "UNKNOWN"
        confidence = 0.0

    is_attack = category != "NORMAL"

    return {
        "category": category,
        "confidence": confidence,
        "is_attack": is_attack,
    }
