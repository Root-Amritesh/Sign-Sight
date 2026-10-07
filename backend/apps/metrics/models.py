from django.db import models

class PredictionDistribution(models.Model):
    timestamp = models.DateTimeField(auto_now_add=True)
    label_counts = models.JSONField()
    mean_confidences = models.JSONField()
    model_version = models.CharField(max_length=50)

class DriftSnapshot(models.Model):
    timestamp = models.DateTimeField(auto_now_add=True)
    drift_score = models.FloatField()
    training_distribution = models.JSONField()
    current_distribution = models.JSONField()
    threshold_used = models.FloatField()
    model_version = models.CharField(max_length=50)
