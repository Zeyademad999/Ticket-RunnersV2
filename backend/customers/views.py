"""
Views for customers app.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.db.models import Q
from core.permissions import IsAdmin, HasPermission
from .models import Customer
from .serializers import CustomerSerializer
from .filters import CustomerFilter


class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.select_related('user').all()
    serializer_class = CustomerSerializer
    permission_classes = [IsAuthenticated]
    filterset_class = CustomerFilter
    search_fields = ['name', 'email', 'phone']
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    
    def get_serializer_context(self):
        """Add request to serializer context for building absolute URLs."""
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
    def get_permissions(self):
        if self.action == 'create':
            return [IsAuthenticated(), HasPermission("customers_create")]
        elif self.action in ['update', 'partial_update']:
            return [IsAuthenticated(), HasPermission("customers_edit")]
        elif self.action == 'destroy':
            return [IsAuthenticated(), HasPermission("customers_delete")]
        elif self.action == 'list' or self.action == 'retrieve':
            return [IsAuthenticated(), HasPermission("customers_view")]
        elif self.action == 'status':
            return [IsAuthenticated(), HasPermission("customers_ban")]
        return [IsAuthenticated()]
    
    @action(detail=True, methods=['put'])
    def status(self, request, pk=None):
        customer = self.get_object()
        customer.status = request.data.get('status', customer.status)
        customer.save()
        serializer = CustomerSerializer(customer, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def bookings(self, request, pk=None):
        customer = self.get_object()
        from tickets.models import Ticket
        tickets = Ticket.objects.filter(customer=customer)
        from tickets.serializers import TicketListSerializer
        serializer = TicketListSerializer(tickets, many=True)
        return Response(serializer.data)
    
    def destroy(self, request, *args, **kwargs):
        """
        Delete customer and all related records.
        This will cascade delete:
        - Tickets (customer and buyer)
        - Dependents
        - Payment Transactions
        - Favorites
        - NFC Cards (will be deleted, not just set to null)
        - Linked AdminUser (if exists)
        """
        customer = self.get_object()
        
        # Get counts for logging/info
        from tickets.models import Ticket
        from nfc_cards.models import NFCCard
        from apps.webapp.models import Favorite
        from payments.models import PaymentTransaction
        
        ticket_count = Ticket.objects.filter(
            Q(customer=customer) | Q(buyer=customer)
        ).count()
        dependent_count = customer.dependents.count()
        payment_count = customer.payment_transactions.count()
        favorite_count = customer.favorites.count()
        nfc_card_count = customer.nfc_cards.count()
        collected_card_count = customer.collected_nfc_cards.count()
        
        # Store customer info for logging before deletion
        customer_name = customer.name
        customer_id = customer.id
        
        # Delete NFC cards owned by customer
        customer.nfc_cards.all().delete()
        
        # Set collector to null for cards where this customer is the collector
        NFCCard.objects.filter(collector=customer).update(collector=None)
        
        # Log the deletion before deleting
        from core.utils import get_client_ip, log_system_action
        try:
            log_system_action(
                user=request.user,
                action='DELETE_CUSTOMER',
                category='customer',
                severity='WARNING',
                description=f'Deleted customer {customer_name} (ID: {customer_id}) with {ticket_count} tickets, {dependent_count} dependents, {payment_count} payments, {favorite_count} favorites, and {nfc_card_count} NFC cards',
                ip_address=get_client_ip(request),
                status='SUCCESS'
            )
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to log customer deletion: {e}")
            pass  # Don't fail deletion if logging fails
        
        # Delete customer directly (CASCADE will handle related records including AdminUser)
        # The customer.user relationship has CASCADE, so deleting customer will delete the user
        customer.delete()
        
        return Response(
            {
                'message': 'Customer and all related records deleted successfully',
                'deleted': {
                    'tickets': ticket_count,
                    'dependents': dependent_count,
                    'payments': payment_count,
                    'favorites': favorite_count,
                    'nfc_cards': nfc_card_count,
                }
            },
            status=status.HTTP_200_OK
        )