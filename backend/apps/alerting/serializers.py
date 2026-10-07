
from rest_framework import serializers
from .models import Alert, AlertThresholdConfig

class AlertSerializer(serializers.ModelSerializer):
    class Meta:
        model = Alert
        fields = '__all__'

class AlertUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Alert
        fields = ['status', 'resolution', 'notes']

class AlertThresholdConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = AlertThresholdConfig
        fields = '__all__'
