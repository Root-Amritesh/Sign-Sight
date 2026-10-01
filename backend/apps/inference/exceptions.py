"""Custom exceptions for the inference app."""


class ModelNotLoadedError(RuntimeError):
    """Raised when inference is attempted but no model is loaded."""
    pass


class InvalidArtifactError(ValueError):
    """Raised when a model artifact directory is malformed or missing expected files."""
    pass


class ModelVersionNotFoundError(FileNotFoundError):
    """Raised when the requested model version directory does not exist."""
    pass
