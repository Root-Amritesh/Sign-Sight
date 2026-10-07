"""In-memory model registry — singleton holding the currently active model.

This module provides the thread-safe ModelRegistry singleton that the rest
of the backend imports as ``registry``. It wraps the ML team's
``HybridNIDSModel`` and exposes a simplified interface for loading,
predicting, and hot-swapping model versions.
"""
import json
import threading
from pathlib import Path

from django.conf import settings

from .contracts import ModelArtifactContract
from .exceptions import ModelNotLoadedError, InvalidArtifactError, ModelVersionNotFoundError

_contract = ModelArtifactContract()


class ModelRegistry:
    """Thread-safe singleton that holds the active HybridNIDSModel."""

    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                inst = super().__new__(cls)
                inst._model = None
                inst.version = None
                inst.metadata = {}
                cls._instance = inst
        return cls._instance

    # -- Public API --

    @property
    def is_loaded(self) -> bool:
        return self._model is not None

    def load(self, version: str) -> None:
        """Load a model version from disk, atomically swapping the active model."""
        version_dir = settings.ML_MODELS_DIR / version
        artifact_path = version_dir / _contract.artifact_file

        if not version_dir.exists():
            raise ModelVersionNotFoundError(f"Version directory not found: {version_dir}")
        if not artifact_path.exists():
            raise InvalidArtifactError(f"Artifact not found: {artifact_path}")

        # Import here to avoid import-time side effects when the ML deps
        # are not installed (e.g. in pure-backend test environments).
        from .ml_model.pipeline import HybridNIDSModel

        model = HybridNIDSModel.load(str(artifact_path))

        # Read sidecar metadata if available
        meta = {}
        model_card = version_dir / _contract.model_card_file
        if model_card.exists():
            with open(model_card) as f:
                meta = json.load(f)

        with self._lock:
            self._model = model
            self.version = version
            self.metadata = meta

    def triage(self, df):
        """Run the full triage pipeline on a DataFrame of flow records."""
        if not self.is_loaded:
            raise ModelNotLoadedError("No model is loaded — deploy a version first")
        return self._model.triage(df)

    def attack_probability(self, df):
        """Return P(attack) per flow."""
        if not self.is_loaded:
            raise ModelNotLoadedError("No model is loaded")
        return self._model.attack_probability(df)

    def anomaly_score(self, df):
        """Return stage-1 anomaly scores."""
        if not self.is_loaded:
            raise ModelNotLoadedError("No model is loaded")
        return self._model.anomaly_score(df)

    def summary(self):
        """Return a human-readable operating-point summary."""
        if not self.is_loaded:
            return {}
        return self._model.summary()


registry = ModelRegistry()
