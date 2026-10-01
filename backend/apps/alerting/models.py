import uuid
from django.db import models
from apps.accounts.models import User
from apps.ingestion.models import TrafficRecord

class Alert(models.Model):
    SEVERITY_CHOICES = (
        ('info', 'Info'),
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    )
    STATUS_CHOICES = (
        ('new', 'New'),
        ('viewed', 'Viewed'),
        ('escalated', 'Escalated'),
        ('resolved', 'Resolved'),
    )
    RESOLUTION_CHOICES = (
        ('true_positive', 'True Positive'),
        ('false_positive', 'False Positive'),
    )
    ALERT_TYPE_CHOICES = (
        ('known_attack', 'Known Attack'),
        ('novel_suspicious', 'Novel Suspicious'),
        ('uncertain_normal', 'Uncertain Normal'),
    )
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    traffic_record = models.ForeignKey(TrafficRecord, on_delete=models.CASCADE)
    predicted_label = models.CharField(max_length=50)
    confidence = models.FloatField()
    probabilities = models.JSONField()
    
    anomaly_score = models.FloatField(default=0.0)
    alert_type = models.CharField(max_length=50, choices=ALERT_TYPE_CHOICES, default='known_attack')
    explanation = models.JSONField(null=True, blank=True)
    top_features = models.JSONField(null=True, blank=True)
    
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='new')
    resolution = models.CharField(max_length=20, choices=RESOLUTION_CHOICES, null=True, blank=True)
    model_version = models.CharField(max_length=50)
    notes = models.TextField(null=True, blank=True)
    resolved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    
    source_ip = models.GenericIPAddressField(null=True, blank=True)
    dest_ip = models.GenericIPAddressField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class AlertThresholdConfig(models.Model):
    config = models.JSONField()
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
