"""
Views for nfc_cards app.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from core.permissions import IsAdmin
from .models import NFCCard
from .serializers import NFCCardSerializer
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
