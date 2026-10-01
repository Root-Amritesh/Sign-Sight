import uuid
from django.db import models

class TrafficRecord(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    raw_features = models.JSONField(default=dict)
    
    protocol_type = models.CharField(max_length=20, null=True, blank=True)
    service = models.CharField(max_length=50, null=True, blank=True)
    flag = models.CharField(max_length=20, null=True, blank=True)
    src_bytes = models.BigIntegerField(null=True, blank=True)
    dst_bytes = models.BigIntegerField(null=True, blank=True)
    
    status = models.CharField(max_length=50, default='new')
    ingested_at = models.DateTimeField(auto_now_add=True)
    
    source_ip = models.GenericIPAddressField(null=True, blank=True)
    dest_ip = models.GenericIPAddressField(null=True, blank=True)
