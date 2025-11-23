"""
Filters for tickets app.
"""
import django_filters
from django.db import models
from .models import Ticket


class TicketFilter(django_filters.FilterSet):
    """
    Filter set for Ticket model.
    """
    event = django_filters.NumberFilter(field_name='event__id')
    customer = django_filters.NumberFilter(field_name='customer__id')
    status = django_filters.ChoiceFilter(choices=Ticket.STATUS_CHOICES)
    date_from = django_filters.DateTimeFilter(field_name='purchase_date', lookup_expr='gte')
    date_to = django_filters.DateTimeFilter(field_name='purchase_date', lookup_expr='lte')
    search = django_filters.CharFilter(method='filter_search')
    
    class Meta:
        model = Ticket
        fields = ['event', 'customer', 'status', 'date_from', 'date_to', 'search']
    
    def filter_search(self, queryset, name, value):
        """
        Search in ticket number, event title, customer name.
        """
        return queryset.filter(
            models.Q(ticket_number__icontains=value) |
            models.Q(event__title__icontains=value) |
            models.Q(customer__name__icontains=value)
        )

