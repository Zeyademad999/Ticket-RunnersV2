"""
Filters for system app.
"""
import django_filters
from .models import SystemLog, CheckinLog


class SystemLogFilter(django_filters.FilterSet):
    user = django_filters.NumberFilter(field_name='user__id')
    category = django_filters.ChoiceFilter(choices=SystemLog.CATEGORY_CHOICES)
    severity = django_filters.ChoiceFilter(choices=SystemLog.SEVERITY_CHOICES)
    date_from = django_filters.DateTimeFilter(field_name='timestamp', lookup_expr='gte')
    date_to = django_filters.DateTimeFilter(field_name='timestamp', lookup_expr='lte')
    
    class Meta:
        model = SystemLog
        fields = ['user', 'category', 'severity', 'date_from', 'date_to']


class CheckinLogFilter(django_filters.FilterSet):
    event = django_filters.NumberFilter(field_name='event__id')
    customer = django_filters.NumberFilter(field_name='customer__id')
    scan_result = django_filters.ChoiceFilter(choices=CheckinLog.SCAN_RESULT_CHOICES)
    
    class Meta:
        model = CheckinLog
        fields = ['event', 'customer', 'scan_result']

