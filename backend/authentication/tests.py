"""
Tests for authentication app.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

User = get_user_model()


class AuthenticationTestCase(TestCase):
    """
    Test cases for authentication endpoints.
    """
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testadmin',
            email='test@example.com',
            password='testpass123',
            role='ADMIN'
        )
    
    def test_login_success(self):
        """Test successful login."""
        response = self.client.post('/api/auth/login/', {
            'username': 'testadmin',
            'password': 'testpass123'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access_token', response.data)
        self.assertIn('refresh_token', response.data)
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials."""
        response = self.client.post('/api/auth/login/', {
            'username': 'testadmin',
            'password': 'wrongpassword'
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_me_endpoint(self):
        """Test getting current user profile."""
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/auth/me/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'testadmin')
