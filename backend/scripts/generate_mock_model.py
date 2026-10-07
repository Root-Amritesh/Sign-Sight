import os
import json
import joblib
from pathlib import Path
import numpy as np
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import IsolationForest
import lightgbm as lgb
from sklearn.base import BaseEstimator, TransformerMixin

class MockIsolationForest(BaseEstimator):
    def fit(self, X, y=None):
        return self
    def score_samples(self, X):
        return np.random.uniform(-1, 0, size=len(X))

class MockLGBMClassifier(BaseEstimator):
    def __init__(self):
        self.classes_ = np.array([0, 1, 2, 3, 4])
    def fit(self, X, y=None):
        return self
    def predict(self, X):
        return np.random.choice(self.classes_, size=len(X))
    def predict_proba(self, X):
        probs = np.random.rand(len(X), len(self.classes_))
        return probs / probs.sum(axis=1, keepdims=True)

class DataFrameSelector(BaseEstimator, TransformerMixin):
    def fit(self, X, y=None):
        return self
    def transform(self, X):
        # Dummy transform: just return random numeric data of shape (len(X), 10)
        return np.random.rand(len(X), 10)

def generate_mock_model(version="v1.0.0"):
    base_dir = Path(__file__).resolve().parent.parent
    artifact_dir = base_dir / 'ml_artifacts' / 'models' / version
    artifact_dir.mkdir(parents=True, exist_ok=True)
    
    # 1. Stage 1 Pipeline (Isolation Forest)
    stage1 = Pipeline([
        ('selector', DataFrameSelector()),
        ('scaler', StandardScaler()),
        ('model', MockIsolationForest())
    ])
    stage1.fit(np.zeros((10, 10)))
    joblib.dump(stage1, artifact_dir / 'stage1_anomaly.joblib')
    
    # 2. Stage 2 Pipeline (LGBM)
    stage2 = Pipeline([
        ('selector', DataFrameSelector()),
        ('scaler', StandardScaler()),
        ('model', MockLGBMClassifier())
    ])
    stage2.fit(np.zeros((10, 10)))
    joblib.dump(stage2, artifact_dir / 'stage2_classifier.joblib')
    
    # 3. Metadata
    metadata = {
        "model_version": version,
        "trained_at": "2026-10-01T12:00:00Z",
        "labels": {
            "mapping": {
                "0": "normal",
                "1": "dos",
                "2": "probe",
                "3": "r2l",
                "4": "u2r"
            }
        },
        "metrics": {
            "f1_macro": 0.92,
            "accuracy": 0.95,
            "per_class_f1": {
                "normal": 0.98,
                "dos": 0.94,
                "probe": 0.89,
                "r2l": 0.72,
                "u2r": 0.45
            }
        }
    }
    with open(artifact_dir / 'metadata.json', 'w') as f:
        json.dump(metadata, f, indent=2)
        
    print(f"Mock model {version} generated in {artifact_dir}")

if __name__ == "__main__":
    generate_mock_model()
