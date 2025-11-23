"""
Views for analytics app.
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Count, Sum
from django.core.cache import cache
from django.conf import settings
from events.models import Event
from tickets.models import Ticket
from customers.models import Customer
from nfc_cards.models import NFCCard
