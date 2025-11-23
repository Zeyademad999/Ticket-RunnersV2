"""
Filters for events app.
"""
import django_filters
from django.db import models
from .models import Event


class EventFilter(django_filters.FilterSet):
    """
    Filter set for Event model.
    """
    status = django_filters.ChoiceFilter(choices=Event.STATUS_CHOICES)
    organizer = django_filters.NumberFilter(field_name='organizer__id')
    category = django_filters.NumberFilter(field_name='category__id')
    date_from = django_filters.DateFilter(field_name='date', lookup_expr='gte')
    date_to = django_filters.DateFilter(field_name='date', lookup_expr='lte')
    search = django_filters.CharFilter(method='filter_search')
    
    class Meta:
        model = Event
        fields = ['status', 'organizer', 'category', 'date_from', 'date_to', 'search']
    
    def filter_search(self, queryset, name, value):
        """
        Search in title and description.
        """
        return queryset.filter(
            models.Q(title__icontains=value) |
            models.Q(description__icontains=value)
        )

