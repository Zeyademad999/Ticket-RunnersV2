"""
Filters for nfc_cards app.
"""
import django_filters
from django.utils import timezone
from .models import NFCCard


class NFCCardFilter(django_filters.FilterSet):
    status = django_filters.ChoiceFilter(choices=NFCCard.STATUS_CHOICES)
    customer = django_filters.NumberFilter(field_name='customer__id')
    expired = django_filters.BooleanFilter(method='filter_expired')
    search = django_filters.CharFilter(field_name='serial_number', lookup_expr='icontains')
    
    class Meta:
        model = NFCCard
        fields = ['status', 'customer', 'expired', 'search']
    
    def filter_expired(self, queryset, name, value):
        if value:
            return queryset.filter(expiry_date__lt=timezone.now().date())
        return queryset.filter(expiry_date__gte=timezone.now().date())

