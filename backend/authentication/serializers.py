"""
Serializers for authentication app.
"""
from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from core.exceptions import AuthenticationError
from .models import AdminUser


class AdminUserSerializer(serializers.ModelSerializer):
    """
    Serializer for AdminUser model.
    """
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    password = serializers.CharField(write_only=True, required=False, allow_blank=True, min_length=6)
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)
    permissions = serializers.JSONField(required=False, allow_null=True)
    
    class Meta:
        model = AdminUser
        fields = ['id', 'username', 'email', 'password', 'first_name', 'last_name', 'role', 'role_display', 'permissions', 'is_active', 'last_login', 'created_at']
        read_only_fields = ['id', 'last_login', 'created_at']
    
    def to_representation(self, instance):
        """Override to ensure permissions is always returned as a list."""
        representation = super().to_representation(instance)
        # Ensure permissions is always a list
        if representation.get('permissions') is None:
            representation['permissions'] = []
        elif not isinstance(representation.get('permissions'), list):
            representation['permissions'] = []
        return representation
    
    def validate_username(self, value):
        """Validate username uniqueness."""
        if self.instance is None:  # This is a create operation
            if AdminUser.objects.filter(username=value).exists():
                raise serializers.ValidationError('A user with that username already exists.')
        else:  # This is an update operation
            if AdminUser.objects.filter(username=value).exclude(pk=self.instance.pk).exists():
                raise serializers.ValidationError('A user with that username already exists.')
        return value
    
    def validate_email(self, value):
        """Validate email uniqueness."""
        if value:  # Email is optional in AbstractUser, but if provided, check uniqueness
            if self.instance is None:  # This is a create operation
                if AdminUser.objects.filter(email=value).exists():
                    raise serializers.ValidationError('A user with that email already exists.')
            else:  # This is an update operation
                if AdminUser.objects.filter(email=value).exclude(pk=self.instance.pk).exists():
                    raise serializers.ValidationError('A user with that email already exists.')
        return value
    
    def validate(self, attrs):
        """Validate serializer data."""
        # For create operations, password is required
        if self.instance is None:  # This is a create operation
            password = attrs.get('password')
            if not password or (isinstance(password, str) and password.strip() == ''):
                raise serializers.ValidationError({'password': 'Password is required for new users.'})
        return attrs
    
    def create(self, validated_data):
        """Create a new admin user with password and permissions."""
        from django.db import IntegrityError
        
        password = validated_data.pop('password', None)
        permissions = validated_data.pop('permissions', None)
        
        # Require password for new users (double check)
        if not password or (isinstance(password, str) and password.strip() == ''):
            raise serializers.ValidationError({'password': 'Password is required for new users.'})
        
        # Set role to ADMIN by default (all admins are just admins)
        # But allow SUPER_ADMIN if explicitly set
        if 'role' not in validated_data:
            validated_data['role'] = 'ADMIN'
        
        try:
            user = AdminUser.objects.create(**validated_data)
        except IntegrityError as e:
            # Check if it's a unique constraint violation
            error_msg = str(e)
            if 'username' in error_msg.lower() or 'unique' in error_msg.lower():
                if AdminUser.objects.filter(username=validated_data.get('username')).exists():
                    raise serializers.ValidationError({'username': ['A user with that username already exists.']})
            if 'email' in error_msg.lower():
                if AdminUser.objects.filter(email=validated_data.get('email')).exists():
                    raise serializers.ValidationError({'email': ['A user with that email already exists.']})
            # Re-raise as ValidationError if we can't determine the field
            raise serializers.ValidationError('A user with these credentials already exists.')
        
        # Set permissions - ensure it's always a list
        if permissions is not None and len(permissions) > 0:
            user.permissions = permissions if isinstance(permissions, list) else []
        else:
            # Assign default permissions based on role
            role = user.role  # Use the user's role attribute
            if role == 'SUPER_ADMIN':
                # Super admins don't need explicit permissions (handled in has_permission method)
                user.permissions = []
            elif role == 'ADMIN':
                # Default admin permissions - basic access to manage events, tickets, customers, and view reports
                user.permissions = [
                    'dashboard_view',
                    'events_view',
                    'events_create',
                    'events_edit',
                    'tickets_view',
                    'tickets_manage',
                    'customers_view',
                    'customers_edit',
                    'reports_view',
                    'analytics_view',
                ]
            elif role == 'SUPPORT':
                # Support staff can manage customers and view tickets/reports
                user.permissions = [
                    'dashboard_view',
                    'customers_view',
                    'customers_edit',
                    'customers_create',
                    'tickets_view',
                    'reports_view',
                ]
            elif role == 'USHER':
                # Ushers can check in tickets and view events
                user.permissions = [
                    'dashboard_view',
                    'checkin_view',
                    'checkin_manage',
                    'tickets_view',
                    'events_view',
                ]
            else:
                # Fallback to minimal permissions
                user.permissions = ['dashboard_view']
        
        # Set password (required for new users)
        user.set_password(password)
        
        try:
            user.save()
        except IntegrityError as e:
            # If save fails due to integrity error, delete the user we just created
            if user.pk:
                AdminUser.objects.filter(pk=user.pk).delete()
            error_msg = str(e)
            if 'username' in error_msg.lower():
                raise serializers.ValidationError({'username': ['A user with that username already exists.']})
            if 'email' in error_msg.lower():
                raise serializers.ValidationError({'email': ['A user with that email already exists.']})
            raise serializers.ValidationError('Failed to create user due to database constraint violation.')
        
        return user
    
    def update(self, instance, validated_data):
        """Update admin user, handling password and permissions separately."""
        password = validated_data.pop('password', None)
        permissions = validated_data.pop('permissions', None)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        if permissions is not None:
            instance.permissions = permissions if isinstance(permissions, list) else []
        
        if password:
            instance.set_password(password)
        
        instance.save()
        return instance


class LoginSerializer(serializers.Serializer):
    """
    Serializer for login endpoint.
    """
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)
    
    def validate(self, attrs):
        username = attrs.get('username')
        password = attrs.get('password')
        
        if not username or not password:
            raise serializers.ValidationError('Must include username and password.')
        
        # Try to authenticate the user
        user = authenticate(username=username, password=password)
        
        if not user:
            # Check if user exists but password is wrong
            try:
                existing_user = AdminUser.objects.get(username=username)
                if not existing_user.is_active:
                    # User exists but is disabled - return 401
                    raise AuthenticationError('User account is disabled.')
                # User exists but password is wrong - return 401
                raise AuthenticationError('Invalid credentials.')
            except AdminUser.DoesNotExist:
                # User doesn't exist - return 401
                raise AuthenticationError('Invalid credentials.')
        
        if not user.is_active:
            raise AuthenticationError('User account is disabled.')
        
        # Ensure it's an AdminUser instance
        if not isinstance(user, AdminUser):
            raise AuthenticationError('Invalid user type.')
        
        attrs['user'] = user
        return attrs


class ChangePasswordSerializer(serializers.Serializer):
    """
    Serializer for change password endpoint.
    """
    old_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True)
    confirm_password = serializers.CharField(required=True, write_only=True)
    
    def validate_new_password(self, value):
        validate_password(value)
        return value
    
    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError({'confirm_password': 'Passwords do not match.'})
        return attrs

