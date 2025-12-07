"""
Views for events app.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.db.models import Sum, Count
from core.permissions import IsAdmin, HasPermission
from core.exceptions import PermissionDenied, NotFoundError
from core.utils import get_client_ip, log_system_action
from .models import Event, TicketCategory, EventCategory
from .serializers import (
    EventListSerializer,
    EventDetailSerializer,
    EventCreateSerializer
)
from .filters import EventFilter


class EventViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Event model.
    """
    queryset = Event.objects.select_related('venue', 'category').prefetch_related('organizers').all()
    permission_classes = [IsAuthenticated]
    filterset_class = EventFilter
    search_fields = ['title', 'description']
    ordering_fields = ['date', 'created_at', 'title']
    ordering = ['-date', '-time']
    parser_classes = [MultiPartParser, FormParser, JSONParser]  # Support file uploads
    
    def get_serializer_class(self):
        if self.action == 'list':
            return EventListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return EventCreateSerializer
        return EventDetailSerializer
    
    def get_permissions(self):
        """
        Override to set permissions based on action.
        """
        if self.action == 'create':
            return [IsAuthenticated(), HasPermission("events_create")]
        elif self.action in ['update', 'partial_update']:
            return [IsAuthenticated(), HasPermission("events_edit")]
        elif self.action == 'destroy':
            return [IsAuthenticated(), HasPermission("events_delete")]
        elif self.action == 'list' or self.action == 'retrieve':
            return [IsAuthenticated(), HasPermission("events_view")]
        return [IsAuthenticated()]
    
    def list(self, request, *args, **kwargs):
        """
        List all events with filtering and pagination.
        GET /api/events/
        """
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    def retrieve(self, request, *args, **kwargs):
        """
        Retrieve event details.
        GET /api/events/:id/
        """
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)
    
    def create(self, request, *args, **kwargs):
        """
        Create a new event.
        POST /api/events/
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        # Log system action
        ip_address = get_client_ip(request)
        log_system_action(
            user=request.user,
            action='CREATE_EVENT',
            category='event',
            severity='INFO',
            description=f'Created event: {serializer.instance.title}',
            ip_address=ip_address,
            status='SUCCESS'
        )
        
        headers = self.get_success_headers(serializer.data)
        return Response(
            EventDetailSerializer(serializer.instance).data,
            status=status.HTTP_201_CREATED,
            headers=headers
        )
    
    def update(self, request, *args, **kwargs):
        """
        Update an event.
        PUT /api/events/:id/
        """
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        # Log system action
        ip_address = get_client_ip(request)
        log_system_action(
            user=request.user,
            action='UPDATE_EVENT',
            category='event',
            severity='INFO',
            description=f'Updated event: {instance.title}',
            ip_address=ip_address,
            status='SUCCESS'
        )
        
        return Response(EventDetailSerializer(instance).data)
    
    def destroy(self, request, *args, **kwargs):
        """
        Delete an event.
        DELETE /api/events/:id/
        """
        import logging
        logger = logging.getLogger(__name__)
        
        instance = self.get_object()
        
        # Check if event has sold tickets
        if instance.tickets_sold > 0:
            raise PermissionDenied(
                'Cannot delete event with sold tickets. Cancel the event instead.'
            )
        
        # Save event details before deletion
        event_title = instance.title
        event_id = instance.id
        
        # Delete the event
        try:
            self.perform_destroy(instance)
        except Exception as e:
            logger.error(f"Error deleting event {event_id}: {str(e)}", exc_info=True)
            return Response(
                {'error': f'Failed to delete event: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Log system action (wrap in try-except to prevent logging errors from breaking deletion)
        try:
            ip_address = get_client_ip(request) or ''
            log_system_action(
                user=request.user if hasattr(request, 'user') else None,
                action='DELETE_EVENT',
                category='event',
                severity='WARNING',
                description=f'Deleted event: {event_title}',
                ip_address=ip_address,
                status='SUCCESS'
            )
        except Exception as e:
            # Log the error but don't fail the deletion
            logger.warning(f"Failed to log event deletion: {str(e)}", exc_info=True)
        
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=True, methods=['get'])
    def ushers(self, request, pk=None):
        """
        Get ushers assigned to this event.
        GET /api/events/:id/ushers/
        """
        event = self.get_object()
        from users.serializers import UsherSerializer
        ushers = event.ushers.all()
        serializer = UsherSerializer(ushers, many=True)
        return Response({
            'event_id': event.id,
            'event_title': event.title,
            'ushers': serializer.data,
            'count': ushers.count()
        })
    
    @action(detail=True, methods=['get'])
    def statistics(self, request, pk=None):
        """
        Get event statistics.
        GET /api/events/:id/statistics/
        """
        from django.db.models import Count, Sum, Q
        from django.utils import timezone
        from datetime import timedelta
        from collections import defaultdict
        
        event = self.get_object()
        
        from tickets.models import Ticket
        
        tickets = Ticket.objects.filter(event=event)
        
        # Calculate sales trend (daily sales over time)
        sales_trend = []
        if event.created_at:
            # Get date range from event creation to now
            start_date = event.created_at.date()
            end_date = timezone.now().date()
            current_date = start_date
            
            # Group tickets by purchase date
            daily_sales = defaultdict(int)
            valid_tickets = tickets.filter(status__in=['valid', 'used'])
            for ticket in valid_tickets:
                if ticket.purchase_date:
                    purchase_date = ticket.purchase_date.date()
                    daily_sales[purchase_date] += 1
            
            # Create cumulative sales data
            cumulative = 0
            day_count = 0
            while current_date <= end_date and day_count < 30:  # Limit to 30 days
                day_sales = daily_sales.get(current_date, 0)
                cumulative += day_sales
                sales_trend.append({
                    'date': current_date.isoformat(),
                    'day': f"Day {day_count + 1}",
                    'sales': day_sales,
                    'cumulative': cumulative
                })
                current_date += timedelta(days=1)
                day_count += 1
        
        # Get recent ticket sales for activity feed
        recent_tickets = tickets.filter(status__in=['valid', 'used']).select_related('customer', 'buyer').order_by('-purchase_date')[:10]
        recent_activity = []
        for ticket in recent_tickets:
            customer_name = None
            if ticket.customer:
                customer_name = ticket.customer.name
            elif ticket.buyer:
                customer_name = ticket.buyer.name
            
            if customer_name:
                recent_activity.append({
                    'action': 'ticket_sold',
                    'user': customer_name,
                    'time': ticket.purchase_date.isoformat() if ticket.purchase_date else None,
                    'ticket_id': str(ticket.id),
                    'category': ticket.category or 'N/A',
                    'price': float(ticket.price) if ticket.price else 0
                })
        
        stats = {
            'total_tickets': event.total_tickets,
            'tickets_sold': tickets.filter(status__in=['valid', 'used']).count(),
            'tickets_used': tickets.filter(status='used').count(),
            'tickets_refunded': tickets.filter(status='refunded').count(),
            'tickets_available': event.tickets_available,
            'revenue': float(event.calculate_revenue()),
            'commission': float(event.calculate_commission()),
            'payout': float(event.calculate_revenue() - event.calculate_commission()),
            'attendance_rate': (
                (tickets.filter(status='used').count() / event.total_tickets * 100)
                if event.total_tickets > 0 else 0
            ),
            'sales_trend': sales_trend,
            'recent_activity': recent_activity
        }
        
        return Response(stats)
    
    @action(detail=False, methods=['get'], url_path='categories')
    def categories(self, request):
        """
        Get all event categories.
        GET /api/events/categories/
        """
        categories = EventCategory.objects.all().order_by('name')
        return Response([
            {
                'id': cat.id,
                'name': cat.name,
                'description': cat.description,
            }
            for cat in categories
        ])
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, HasPermission("events_edit")])
    def cancel(self, request, pk=None):
        """
        Cancel an event.
        POST /api/events/:id/cancel/
        """
        event = self.get_object()
        
        # Check if event is already cancelled
        if event.status == 'cancelled':
            return Response(
                {'error': 'Event is already cancelled'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if event is already completed
        if event.status == 'completed':
            return Response(
                {'error': 'Cannot cancel a completed event'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update event status to cancelled
        event.status = 'cancelled'
        event.save(update_fields=['status'])
        
        # Log system action
        ip_address = get_client_ip(request)
        log_system_action(
            user=request.user,
            action='CANCEL_EVENT',
            category='event',
            severity='WARNING',
            description=f'Cancelled event: {event.title}',
            ip_address=ip_address,
            status='SUCCESS'
        )
        
        return Response(
            {
                'message': 'Event cancelled successfully',
                'event': EventDetailSerializer(event).data
            },
            status=status.HTTP_200_OK
        )