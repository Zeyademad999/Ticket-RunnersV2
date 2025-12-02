"""
Serializers for system app.
"""
from rest_framework import serializers
from .models import SystemLog, CheckinLog


class SystemLogSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    user = serializers.SerializerMethodField()
    
    class Meta:
        model = SystemLog
        fields = '__all__'
        read_only_fields = ['id', 'created_at']
    
    def get_user_name(self, obj):
        """
        Return the user's full name (first_name + last_name) or username.
        If user is None, return empty string.
        """
        if not obj.user:
            return ""
        
        # Try to get full name (first_name + last_name)
        if obj.user.first_name or obj.user.last_name:
            full_name = f"{obj.user.first_name or ''} {obj.user.last_name or ''}".strip()
            if full_name:
                return full_name
        
        # Fallback to username
        return obj.user.username or ""
    
    def get_user(self, obj):
        """
        Return user object with name and username for frontend compatibility.
        """
        if not obj.user:
            return None
        
        return {
            'id': obj.user.id,
            'username': obj.user.username,
            'first_name': obj.user.first_name or '',
            'last_name': obj.user.last_name or '',
            'name': self.get_user_name(obj),  # Include computed name for frontend
            'role': obj.user.role if hasattr(obj.user, 'role') else None,
        }


class CheckinLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = CheckinLog
        fields = '__all__'
        read_only_fields = ['id', 'created_at']

