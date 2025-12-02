"""
Filters for customers app.
"""
import django_filters
from django.db import models
from .models import Customer


class CustomerFilter(django_filters.FilterSet):
    status = django_filters.ChoiceFilter(choices=Customer.STATUS_CHOICES)
    search = django_filters.CharFilter(method='filter_search')
    recurrent = django_filters.BooleanFilter(field_name='is_recurrent')
    
    class Meta:
        model = Customer
        fields = ['status', 'search', 'recurrent']
    
    def filter_search(self, queryset, name, value):
        return queryset.filter(
            models.Q(name__icontains=value) |
            models.Q(email__icontains=value) |
            models.Q(phone__icontains=value)
        )

