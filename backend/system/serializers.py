"""
Serializers for system app.
"""
from rest_framework import serializers
from .models import SystemLog, CheckinLog


class SystemLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemLog
        fields = '__all__'
        read_only_fields = ['id', 'created_at']


class CheckinLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = CheckinLog
        fields = '__all__'
        read_only_fields = ['id', 'created_at']

