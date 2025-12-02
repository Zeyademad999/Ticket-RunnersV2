"""
Filters for venues app.
"""
import django_filters
from .models import Venue


class VenueFilter(django_filters.FilterSet):
    city = django_filters.CharFilter(field_name='city', lookup_expr='iexact')
    status = django_filters.ChoiceFilter(choices=Venue.STATUS_CHOICES)
    search = django_filters.CharFilter(field_name='name', lookup_expr='icontains')
    
    class Meta:
        model = Venue
        fields = ['city', 'status', 'search']

