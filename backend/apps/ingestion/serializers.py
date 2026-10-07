
from rest_framework import serializers

class IngestRecordSerializer(serializers.Serializer):
    features = serializers.JSONField()

class BatchIngestSerializer(serializers.Serializer):
    records = serializers.ListField(child=serializers.JSONField())
