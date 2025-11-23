"""
Serializers for customers app.
"""
from rest_framework import serializers
from django.contrib.auth.hashers import make_password
from .models import Customer


class CustomerSerializer(serializers.ModelSerializer):
    profile_image = serializers.SerializerMethodField()
    
    class Meta:
        model = Customer
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_profile_image(self, obj):
        """Get full URL for profile image."""
        if obj.profile_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.profile_image.url)
            return obj.profile_image.url if hasattr(obj.profile_image, 'url') else str(obj.profile_image)
        return None
    
    def create(self, validated_data):
        # Hash password if provided
        if 'password' in validated_data and validated_data['password']:
            validated_data['password'] = make_password(validated_data['password'])
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        # Hash password if provided
        if 'password' in validated_data and validated_data['password']:
            validated_data['password'] = make_password(validated_data['password'])
        return super().update(instance, validated_data)

