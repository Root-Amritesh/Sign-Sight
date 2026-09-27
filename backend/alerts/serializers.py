from rest_framework import serializers
from .models import Alert, ModelMetadata

class AlertSerializer(serializers.ModelSerializer):
    class Meta:
        model = Alert
        fields = '__all__'
        read_only_fields = ('timestamp', 'severity')

class AlertCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Alert
        fields = (
            'source_ip', 'dest_ip', 'source_port', 'dest_port', 'protocol', 
            'attack_category', 'confidence', 'raw_features', 'model_version'
        )

class AlertVerdictSerializer(serializers.ModelSerializer):
    class Meta:
        model = Alert
        fields = ('analyst_verdict', 'analyst_notes')

class ModelMetadataSerializer(serializers.ModelSerializer):
    class Meta:
        model = ModelMetadata
        fields = '__all__'
        read_only_fields = [f.name for f in ModelMetadata._meta.fields]
