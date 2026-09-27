from typing import Any
from django.db import models

class ModelMetadata(models.Model):
    version = models.CharField(max_length=50, unique=True)
    dataset = models.CharField(max_length=50)
    trained_at = models.DateTimeField()
    artifact_path = models.CharField(max_length=255)
    metrics = models.JSONField(default=dict)
    is_active = models.BooleanField(default=False)
    notes = models.TextField(blank=True)

    def __str__(self) -> str:
        return f"{self.version} (Active: {self.is_active})"

class Alert(models.Model):
    ATTACK_CATEGORIES = [
        ('NORMAL', 'Normal'),
        ('DOS', 'Denial of Service'),
        ('PROBE', 'Probe'),
        ('R2L', 'Root to Local'),
        ('U2R', 'User to Root'),
        ('UNKNOWN', 'Unknown'),
    ]
    
    SEVERITY_CHOICES = [
        ('LOW', 'Low'),
        ('MEDIUM', 'Medium'),
        ('HIGH', 'High'),
        ('CRITICAL', 'Critical'),
    ]
    
    VERDICT_CHOICES = [
        ('PENDING', 'Pending'),
        ('TRUE_POSITIVE', 'True Positive'),
        ('FALSE_POSITIVE', 'False Positive'),
        ('ESCALATED', 'Escalated'),
    ]

    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    source_ip = models.GenericIPAddressField()
    dest_ip = models.GenericIPAddressField()
    source_port = models.PositiveIntegerField()
    dest_port = models.PositiveIntegerField()
    protocol = models.CharField(max_length=10)
    
    attack_category = models.CharField(max_length=50, choices=ATTACK_CATEGORIES)
    confidence = models.FloatField()
    severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES)
    
    raw_features = models.JSONField(default=dict, blank=True)
    model_version = models.CharField(max_length=50)
    
    analyst_verdict = models.CharField(max_length=20, choices=VERDICT_CHOICES, default='PENDING')
    analyst_notes = models.TextField(blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=["timestamp", "severity"]),
        ]
        verbose_name_plural = "alerts"

    def __str__(self) -> str:
        return f"Alert {self.id}: {self.attack_category} from {self.source_ip} to {self.dest_ip} ({self.severity})"

    @classmethod
    def from_prediction(cls, prediction: dict[str, Any]) -> 'Alert':
        """Constructs an Alert from a prediction dictionary."""
        return cls(
            source_ip=prediction['source_ip'],
            dest_ip=prediction['dest_ip'],
            source_port=prediction['source_port'],
            dest_port=prediction['dest_port'],
            protocol=prediction.get('protocol', 'TCP'),
            attack_category=prediction['attack_category'],
            confidence=prediction['confidence'],
            severity=prediction['severity'],
            raw_features=prediction.get('raw_features', {}),
            model_version=prediction.get('model_version', 'unknown'),
        )
