"""
Tests for events app.
"""
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from authentication.models import AdminUser
from users.models import Organizer
from venues.models import Venue
from events.models import Event, EventCategory


class EventsTestCase(TestCase):
    """
    Test cases for events endpoints.
    """
    
    def setUp(self):
        self.client = APIClient()
        self.admin = AdminUser.objects.create_user(
            username='admin',
            email='admin@example.com',
            password='admin123',
            role='ADMIN'
        )
        self.organizer = Organizer.objects.create(
            name='Test Organizer',
            email='organizer@example.com',
            phone='1234567890'
        )
        self.venue = Venue.objects.create(
            name='Test Venue',
            address='123 Test St',
            city='Test City',
            capacity=100
        )
        self.category = EventCategory.objects.create(name='Music')
    
    def test_list_events(self):
        """Test listing events."""
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/events/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_create_event(self):
        """Test creating an event."""
        self.client.force_authenticate(user=self.admin)
        response = self.client.post('/api/events/', {
            'title': 'Test Event',
            'organizer': self.organizer.id,
            'venue': self.venue.id,
            'date': '2024-12-31',
            'time': '18:00:00',
            'category': self.category.id,
            'total_tickets': 100,
            'ticket_limit': 5
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Event.objects.count(), 1)
