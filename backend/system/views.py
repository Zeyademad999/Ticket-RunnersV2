"""
Views for system app.
"""
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from core.permissions import IsAdmin
from .models import SystemLog, CheckinLog
from .serializers import SystemLogSerializer, CheckinLogSerializer
from .filters import SystemLogFilter, CheckinLogFilter


class SystemLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = SystemLog.objects.select_related('user').all()
    serializer_class = SystemLogSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    filterset_class = SystemLogFilter


class CheckinLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = CheckinLog.objects.select_related('event', 'customer', 'nfc_card').all()
    serializer_class = CheckinLogSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    filterset_class = CheckinLogFilter
    
    @action(detail=False, methods=['get'], url_path='event/(?P<event_id>[^/.]+)')
    def event_logs(self, request, event_id=None):
        """
        Get check-in logs for a specific event.
        GET /api/logs/checkin/event/:event_id/
        """
        logs = self.queryset.filter(event_id=event_id)
        serializer = self.get_serializer(logs, many=True)
        return Response(serializer.data)
