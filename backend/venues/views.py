"""
Views for venues app.
"""
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from core.permissions import IsAdmin, IsSuperAdmin, HasPermission
from .models import Venue
from .serializers import VenueSerializer
from .filters import VenueFilter


class VenueViewSet(viewsets.ModelViewSet):
    queryset = Venue.objects.all()
    serializer_class = VenueSerializer
    permission_classes = [IsAuthenticated]
    filterset_class = VenueFilter
    
    def get_permissions(self):
        if self.action == 'create':
            return [IsAuthenticated(), HasPermission("venues_create")]
        elif self.action in ['update', 'partial_update']:
            return [IsAuthenticated(), HasPermission("venues_edit")]
        elif self.action == 'destroy':
            return [IsAuthenticated(), HasPermission("venues_delete")]
        elif self.action == 'list' or self.action == 'retrieve':
            return [IsAuthenticated(), HasPermission("venues_view")]
        return [IsAuthenticated()]
