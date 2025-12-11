"""
Views for nfc_cards app.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from core.permissions import IsAdmin, IsSuperAdmin
from .models import NFCCard, NFCCardSettings
from .serializers import NFCCardSerializer, NFCCardSettingsSerializer
from .filters import NFCCardFilter
import logging

logger = logging.getLogger(__name__)


class NFCCardViewSet(viewsets.ModelViewSet):
    queryset = NFCCard.objects.select_related('customer').all()
    serializer_class = NFCCardSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    filterset_class = NFCCardFilter
    
    def create(self, request, *args, **kwargs):
        """Override create to handle serializer errors gracefully"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            self.perform_create(serializer)
            headers = self.get_success_headers(serializer.data)
            return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
        except Exception as e:
            logger.error(f"Error creating NFC card: {str(e)}", exc_info=True)
            # If card was created but serializer failed, return the card data anyway
            if serializer.instance:
                try:
                    # Try to serialize again with error handling
                    card_data = {
                        'id': str(serializer.instance.id),
                        'serial_number': serializer.instance.serial_number,
                        'status': serializer.instance.status,
                        'card_type': serializer.instance.card_type,
                        'expiry_date': serializer.instance.expiry_date.isoformat() if serializer.instance.expiry_date else None,
                        'issue_date': serializer.instance.issue_date.isoformat() if serializer.instance.issue_date else None,
                        'balance': str(serializer.instance.balance),
                        'customer_id': str(serializer.instance.customer.id) if serializer.instance.customer else None,
                        'customer_name': serializer.instance.customer.name if serializer.instance.customer else None,
                    }
                    headers = self.get_success_headers(card_data)
                    return Response(card_data, status=status.HTTP_201_CREATED, headers=headers)
                except Exception as e2:
                    logger.error(f"Error serializing created card: {str(e2)}", exc_info=True)
            
            # Re-raise the original error
            raise
    
    @action(detail=False, methods=['post'])
    def bulk(self, request):
        action_type = request.data.get('action')
        card_ids = request.data.get('card_ids', [])
        cards = NFCCard.objects.filter(id__in=card_ids)
        
        if action_type == 'activate':
            cards.update(status='active')
        elif action_type == 'deactivate':
            cards.update(status='inactive')
        
        return Response({'message': f'Bulk {action_type} completed', 'count': cards.count()})
    
    @action(detail=True, methods=['post'])
    def transfer(self, request, pk=None):
        card = self.get_object()
        to_customer_id = request.data.get('to_customer_id')
        from customers.models import Customer
        to_customer = Customer.objects.get(id=to_customer_id)
        card.customer = to_customer
        card.save()
        return Response(NFCCardSerializer(card).data)
    
    @action(detail=True, methods=['post'])
    def mark_as_expired(self, request, pk=None):
        """
        Mark an NFC card as expired.
        This will set the card status to 'expired' and set expiry_date to today.
        Works for both assigned and unassigned cards.
        POST /api/nfc-cards/{id}/mark_as_expired/
        """
        from django.utils import timezone
        from datetime import date
        
        card = self.get_object()
        
        # Set card as expired (works for both assigned and unassigned cards)
        card.status = 'expired'
        card.expiry_date = date.today()
        card.save(update_fields=['status', 'expiry_date'])
        
        logger.info(f"Card {card.serial_number} marked as expired by admin {request.user.id} (customer: {card.customer.name if card.customer else 'unassigned'})")
        
        return Response({
            'message': 'Card marked as expired successfully',
            'card': NFCCardSerializer(card).data
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'])
    def mark_as_unpaid(self, request, pk=None):
        """
        Mark an NFC card as unpaid.
        This will delete the customer's payment transaction so they need to pay again.
        POST /api/nfc-cards/{id}/mark_as_unpaid/
        """
        from payments.models import PaymentTransaction
        
        card = self.get_object()
        
        if not card.customer:
            return Response(
                {'error': 'Card is not assigned to a customer'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        customer = card.customer
        
        # Delete all completed payment transactions for this customer
        # This will make the system think they haven't paid for the card
        deleted_count = PaymentTransaction.objects.filter(
            customer=customer,
            status='completed'
        ).delete()[0]
        
        # Optionally, also set the card status to inactive or expired
        # and clear the card assignment
        card.status = 'inactive'
        card.customer = None
        card.assigned_at = None
        card.issue_date = None
        card.expiry_date = None
        card.save(update_fields=['status', 'customer', 'assigned_at', 'issue_date', 'expiry_date'])
        
        logger.info(f"Card {card.serial_number} marked as unpaid by admin {request.user.id}. Deleted {deleted_count} payment transactions for customer {customer.id}")
        
        return Response({
            'message': 'Card marked as unpaid successfully. Customer will need to pay again.',
            'deleted_transactions': deleted_count,
            'card': NFCCardSerializer(card).data
        }, status=status.HTTP_200_OK)


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated, IsSuperAdmin])
def nfc_card_settings(request):
    """
    Get or update NFC card settings (pricing and deactivation).
    GET /api/nfc-cards/settings/
    PUT /api/nfc-cards/settings/
    """
    settings = NFCCardSettings.get_settings()
    
    if request.method == 'GET':
        serializer = NFCCardSettingsSerializer(settings)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    # PUT - Update settings
    serializer = NFCCardSettingsSerializer(settings, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save(updated_by=request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
