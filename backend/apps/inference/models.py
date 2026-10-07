from django.db import models
from apps.accounts.models import User

class ModelVersion(models.Model):
    version = models.CharField(max_length=50, unique=True)
    model_type = models.CharField(max_length=100)
    artifact_path = models.CharField(max_length=255)
    is_active = models.BooleanField(default=False)
    deployed_at = models.DateTimeField(auto_now_add=True)
    deployed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    metadata = models.JSONField()
    
    def __str__(self):
        return f"{self.version} ({'Active' if self.is_active else 'Inactive'})"
