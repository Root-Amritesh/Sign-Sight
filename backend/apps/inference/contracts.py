"""Inference app contracts — data classes defining the ML team's artifact contract."""
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class ModelArtifactContract:
    """Defines the expected structure of an ML model artifact directory.
    
    Per the ML team's contract (see ai/README.md), the artifact directory
    for a given version must contain:
      - signsight_hybrid.joblib — the deployed HybridNIDSModel
      - model_card.json — architecture, params, operating point, features
      - evaluation.json — LODO metrics, per-fold breakdown
    """
    artifact_file: str = 'signsight_hybrid.joblib'
    model_card_file: str = 'model_card.json'
    evaluation_file: str = 'evaluation.json'
    feature_importance_file: str = 'feature_importance.csv'
    config_file: str = 'config.json'


@dataclass
class SOCAlertContract:
    """Wire-format contract for alerts produced by the ML pipeline.
    
    Matches schema ``signsight.soc-alert/v1`` defined in the ML README.
    """
    schema: str = 'signsight.soc-alert/v1'
    verdict_choices: tuple = ('ATTACK', 'ATTACK_NOVEL', 'NOVEL_SUSPICIOUS')
    severity_choices: tuple = ('CRITICAL', 'HIGH', 'MEDIUM')
    action: str = 'NOTIFY_SOC_ANALYST'
    blocking: bool = False
