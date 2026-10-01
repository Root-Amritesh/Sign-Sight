
from rest_framework import serializers
from .models import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role']

class GoogleAuthSerializer(serializers.Serializer):
    credential = serializers.CharField(required=True)
