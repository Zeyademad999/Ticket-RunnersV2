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
    has_notes = django_filters.BooleanFilter(method='filter_has_notes')
    
    class Meta:
        model = Customer
        fields = ['status', 'search', 'recurrent', 'has_notes']
    
    def filter_search(self, queryset, name, value):
        return queryset.filter(
            models.Q(name__icontains=value) |
            models.Q(email__icontains=value) |
            models.Q(phone__icontains=value)
        )
    
    def filter_has_notes(self, queryset, name, value):
        """
        Filter customers by whether they have EVS notes.
        EVS notes are identified by containing "EVS Report" in the notes field.
        """
        if value is True:
            # Filter for customers with EVS notes (notes containing "EVS Report")
            return queryset.filter(
                models.Q(notes__isnull=False) &
                ~models.Q(notes='') &
                models.Q(notes__icontains='EVS Report')
            )
        elif value is False:
            # Filter for customers without EVS notes
            return queryset.filter(
                models.Q(notes__isnull=True) |
                models.Q(notes='') |
                ~models.Q(notes__icontains='EVS Report')
            )
        return queryset

