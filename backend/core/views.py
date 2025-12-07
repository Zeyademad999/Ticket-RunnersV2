"""
Views for core models.
"""
from django.conf import settings
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from core.permissions import IsAdmin
from core.utils import get_client_ip, log_system_action
from .models import HomePageSection
from .serializers import HomePageSectionSerializer, HomePageSectionPublicSerializer


class HomePageSectionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for HomePageSection model.
    Admin can manage sections, public can view active sections.
    """
    queryset = HomePageSection.objects.prefetch_related('events__ticket_categories').all()
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'public_list':
            return HomePageSectionPublicSerializer
        return HomePageSectionSerializer
    
    def get_permissions(self):
        """
        Override to set permissions based on action.
        """
        if self.action == 'public_list':
            return [AllowAny()]
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsAdmin()]
        return [IsAuthenticated()]
    
    def get_queryset(self):
        """
        Filter queryset based on action.
        """
        if self.action == 'public_list':
            return HomePageSection.objects.prefetch_related('events').filter(
                is_active=True
            ).order_by('order', 'section_key')
        return super().get_queryset()
    
    def list(self, request, *args, **kwargs):
        """
        List all home page sections (admin only).
        GET /api/home-page-sections/
        """
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True, context={'request': request})
        return Response(serializer.data)
    
    def retrieve(self, request, *args, **kwargs):
        """
        Retrieve a specific home page section.
        GET /api/home-page-sections/:id/
        """
        instance = self.get_object()
        serializer = self.get_serializer(instance, context={'request': request})
        return Response(serializer.data)
    
    def create(self, request, *args, **kwargs):
        """
        Create a new home page section.
        POST /api/home-page-sections/
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        # Log system action
        ip_address = get_client_ip(request)
        log_system_action(
            user=request.user,
            action='CREATE_HOME_PAGE_SECTION',
            category='content',
            severity='INFO',
            description=f'Created home page section: {serializer.instance.title}',
            ip_address=ip_address,
            status='SUCCESS'
        )
        
        headers = self.get_success_headers(serializer.data)
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED,
            headers=headers
        )
    
    def update(self, request, *args, **kwargs):
        """
        Update a home page section.
        PUT /api/home-page-sections/:id/
        """
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        # Log system action
        ip_address = get_client_ip(request)
        log_system_action(
            user=request.user,
            action='UPDATE_HOME_PAGE_SECTION',
            category='content',
            severity='INFO',
            description=f'Updated home page section: {serializer.instance.title}',
            ip_address=ip_address,
            status='SUCCESS'
        )
        
        return Response(serializer.data)
    
    def partial_update(self, request, *args, **kwargs):
        """
        Partially update a home page section.
        PATCH /api/home-page-sections/:id/
        """
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        # Log system action
        ip_address = get_client_ip(request)
        log_system_action(
            user=request.user,
            action='UPDATE_HOME_PAGE_SECTION',
            category='content',
            severity='INFO',
            description=f'Updated home page section: {serializer.instance.title}',
            ip_address=ip_address,
            status='SUCCESS'
        )
        
        return Response(serializer.data)
    
    def destroy(self, request, *args, **kwargs):
        """
        Delete a home page section.
        DELETE /api/home-page-sections/:id/
        """
        instance = self.get_object()
        section_title = instance.title
        
        # Log system action
        ip_address = get_client_ip(request)
        log_system_action(
            user=request.user,
            action='DELETE_HOME_PAGE_SECTION',
            category='content',
            severity='WARNING',
            description=f'Deleted home page section: {section_title}',
            ip_address=ip_address,
            status='SUCCESS'
        )
        
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def public_list(self, request):
        """
        Get all active home page sections for public display.
        GET /api/home-page-sections/public_list/
        """
        try:
            queryset = self.get_queryset()
            serializer = self.get_serializer(queryset, many=True, context={'request': request})
            return Response(serializer.data)
        except Exception as e:
            import logging
            import traceback
            logger = logging.getLogger(__name__)
            logger.error(f"Error in public_list: {str(e)}")
            logger.error(traceback.format_exc())
            return Response(
                {
                    'error': {
                        'code': 'INTERNAL_ERROR',
                        'message': 'An error occurred while fetching home page sections',
                        'details': str(e) if settings.DEBUG else None
                    }
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

