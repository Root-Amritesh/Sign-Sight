"""Metrics serializers."""
from rest_framework import serializers
from .models import DriftSnapshot, PredictionDistribution


class DriftSnapshotSerializer(serializers.ModelSerializer):
    class Meta:
        model = DriftSnapshot
        fields = '__all__'


class PredictionDistributionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PredictionDistribution
        fields = '__all__'
