"""
Views for finances app.
"""
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count
from core.permissions import IsAdmin, IsSuperAdmin
from core.exceptions import PermissionDenied
from .models import Expense, Payout, CompanyFinance, ProfitShare, Settlement, Deposit, ProfitWithdrawal, Deduction
from .serializers import (
    ExpenseSerializer, PayoutSerializer, CompanyFinanceSerializer,
    ProfitShareSerializer, SettlementSerializer, DepositSerializer, ProfitWithdrawalSerializer, DeductionSerializer
)


class ExpenseViewSet(viewsets.ModelViewSet):
    queryset = Expense.objects.select_related('created_by').all()
    serializer_class = ExpenseSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    filterset_fields = ['category', 'date']
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """
        Get expense summary by category.
        GET /api/finances/expenses/summary/
        """
        from django.db.models import Sum
        summary = Expense.objects.values('category').annotate(
            total_amount=Sum('amount'),
            count=Count('id')
        ).order_by('-total_amount')
        return Response(list(summary))


class PayoutViewSet(viewsets.ModelViewSet):
    queryset = Payout.objects.select_related('organizer').all()
    serializer_class = PayoutSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    filterset_fields = ['status', 'organizer']
    
    @action(detail=True, methods=['put'])
    def process(self, request, pk=None):
        payout = self.get_object()
        payout.status = 'processing'
        payout.save()
        return Response(PayoutSerializer(payout).data)


class CompanyFinanceViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = CompanyFinance.objects.all().order_by('-date')
    serializer_class = CompanyFinanceSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    
    @action(detail=False, methods=['get'])
    def revenue(self, request):
        """
        Get company revenue breakdown.
        GET /api/finances/company/revenue/
        """
        from django.db.models import Sum
        from django.utils import timezone
        from datetime import timedelta
        
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        
        queryset = CompanyFinance.objects.all()
        if date_from:
            queryset = queryset.filter(date__gte=date_from)
        if date_to:
            queryset = queryset.filter(date__lte=date_to)
        
        total_revenue = queryset.aggregate(total=Sum('revenue'))['total'] or 0
        total_expenses = queryset.aggregate(total=Sum('expenses'))['total'] or 0
        total_profit = queryset.aggregate(total=Sum('profit'))['total'] or 0
        
        return Response({
            'total_revenue': float(total_revenue),
            'total_expenses': float(total_expenses),
            'total_profit': float(total_profit),
            'records': CompanyFinanceSerializer(queryset, many=True).data
        })
    
    @action(detail=False, methods=['get'])
    def expenses(self, request):
        """
        Get company expenses breakdown.
        GET /api/finances/company/expenses/
        """
        from django.db.models import Sum
        
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        
        queryset = CompanyFinance.objects.all()
        if date_from:
            queryset = queryset.filter(date__gte=date_from)
        if date_to:
            queryset = queryset.filter(date__lte=date_to)
        
        total_expenses = queryset.aggregate(total=Sum('expenses'))['total'] or 0
        
        return Response({
            'total_expenses': float(total_expenses),
            'records': CompanyFinanceSerializer(queryset, many=True).data
        })


class ProfitShareViewSet(viewsets.ModelViewSet):
    queryset = ProfitShare.objects.all()
    serializer_class = ProfitShareSerializer
    permission_classes = [IsAuthenticated, IsSuperAdmin]


class SettlementViewSet(viewsets.ModelViewSet):
    queryset = Settlement.objects.all()
    serializer_class = SettlementSerializer
    permission_classes = [IsAuthenticated, IsSuperAdmin]


class DepositViewSet(viewsets.ModelViewSet):
    queryset = Deposit.objects.all()
    serializer_class = DepositSerializer
    permission_classes = [IsAuthenticated, IsSuperAdmin]


class ProfitWithdrawalViewSet(viewsets.ModelViewSet):
    queryset = ProfitWithdrawal.objects.all()
    serializer_class = ProfitWithdrawalSerializer
    permission_classes = [IsAuthenticated]
    
    @action(detail=True, methods=['put'])
    def approve(self, request, pk=None):
        withdrawal = self.get_object()
        if request.user.role != 'SUPER_ADMIN':
            raise PermissionDenied('Only super admins can approve withdrawals')
        withdrawal.status = 'approved'
        withdrawal.save()
        return Response({'message': 'Withdrawal approved'})


class DeductionViewSet(viewsets.ModelViewSet):
    queryset = Deduction.objects.select_related('created_by').all()
    serializer_class = DeductionSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    filterset_fields = ['is_active', 'type']
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


# Profit calculation endpoints
from rest_framework.decorators import api_view, permission_classes
from django.db.models import Sum, Q
from decimal import Decimal


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def ticket_runner_profit(request):
    """
    Calculate Ticket Runner Net Profit.
    Total Revenue = Ticket Revenue + EVS Card Revenue
    Deductions = All custom deductions + Ticket Runner fee
    Ticket Runner Net Profit = Total Revenue - All Deductions - Ticket Runner % from tickets
    
    GET /api/finances/ticket-runner-profit/
    """
    from tickets.models import Ticket
    from nfc_cards.models import NFCCardTransaction
    from events.models import Event
    
    # Calculate ticket revenue (excluding black card tickets)
    ticket_revenue = Decimal(str(Ticket.objects.filter(
        status__in=['valid', 'used'],
        is_black_card=False
    ).aggregate(total=Sum('price'))['total'] or 0))
    
    # Calculate EVS card revenue
    try:
        card_revenue = Decimal(str(NFCCardTransaction.objects.filter(
            transaction_type='purchase'
        ).aggregate(total=Sum('amount'))['total'] or 0))
    except Exception:
        card_revenue = Decimal('0.00')
    
    # Total revenue
    total_revenue = ticket_revenue + card_revenue
    
    # Get total tickets sold (for fixed_per_ticket deductions)
    tickets_sold = Ticket.objects.filter(
        status__in=['valid', 'used'],
        is_black_card=False
    ).count()
    
    # Calculate all active deductions
    deductions = Deduction.objects.filter(is_active=True)
    total_deductions = Decimal('0.00')
    deduction_details = []
    
    for deduction in deductions:
        if deduction.type == 'percentage':
            amount = deduction.calculate_amount(total_revenue=total_revenue)
        else:  # fixed_per_ticket
            amount = deduction.calculate_amount(tickets_sold=tickets_sold)
        
        total_deductions += amount
        deduction_details.append({
            'name': deduction.name,
            'type': deduction.type,
            'value': float(deduction.value),
            'amount': float(amount)
        })
    
    # Calculate Ticket Runner fee (commission from tickets)
    # This is the percentage Ticket Runner takes from ticket revenue
    # According to requirements: "Ticket Runner fees should also be deducted from the total revenue"
    ticket_runner_fee = Decimal('0.00')
    events = Event.objects.all()
    for event in events:
        commission = event.calculate_commission()
        ticket_runner_fee += Decimal(str(commission))
    
    # Add Ticket Runner fee to deductions (as per requirements)
    total_deductions += ticket_runner_fee
    deduction_details.append({
        'name': 'Ticket Runner Fee',
        'type': 'calculated',
        'value': None,
        'amount': float(ticket_runner_fee)
    })
    
    # Calculate Ticket Runner Net Profit
    # According to requirements: "Ticket Runner Net Profit = % of ticket runners from the total"
    # For now, Ticket Runner gets 100% of remaining after all deductions
    # This can be adjusted if there's a specific percentage to apply
    ticket_runner_net_profit = total_revenue - total_deductions
    
    return Response({
        'ticket_revenue': float(ticket_revenue),
        'card_revenue': float(card_revenue),
        'total_revenue': float(total_revenue),
        'deductions': deduction_details,
        'total_deductions': float(total_deductions),
        'ticket_runner_fee': float(ticket_runner_fee),
        'ticket_runner_net_profit': float(ticket_runner_net_profit),
        'tickets_sold': tickets_sold,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def organizer_profit(request, organizer_id=None):
    """
    Calculate Organizer Net Profit.
    Organizer only sees ticket revenue (not card revenue).
    Deductions only apply to ticket revenue.
    Organizer Net Profit = Ticket Revenue - Deductions (from tickets only) - Ticket Runner % from tickets
    
    GET /api/finances/organizer-profit/
    GET /api/finances/organizer-profit/{organizer_id}/
    """
    from tickets.models import Ticket
    from events.models import Event
    from core.permissions import IsOrganizer
    
    # If organizer_id provided, use it; otherwise get from request (for organizer portal)
    if organizer_id:
        from users.models import Organizer
        try:
            organizer = Organizer.objects.get(id=organizer_id)
        except Organizer.DoesNotExist:
            return Response({'error': 'Organizer not found'}, status=404)
    elif hasattr(request, 'organizer'):
        organizer = request.organizer
    else:
        return Response({'error': 'Organizer not specified'}, status=400)
    
    # Get organizer's events
    events = Event.objects.filter(organizers=organizer)
    
    # Calculate ticket revenue for this organizer's events (excluding black card tickets)
    ticket_revenue = Decimal(str(Ticket.objects.filter(
        event__in=events,
        status__in=['valid', 'used'],
        is_black_card=False
    ).aggregate(total=Sum('price'))['total'] or 0))
    
    # Get tickets sold for this organizer's events
    tickets_sold = Ticket.objects.filter(
        event__in=events,
        status__in=['valid', 'used'],
        is_black_card=False
    ).count()
    
    # Calculate deductions (only those that apply to ticket revenue)
    deductions = Deduction.objects.filter(is_active=True)
    total_deductions = Decimal('0.00')
    deduction_details = []
    
    for deduction in deductions:
        if deduction.type == 'percentage':
            # For organizer, percentage is calculated from ticket revenue only
            amount = deduction.calculate_amount(total_revenue=ticket_revenue)
        else:  # fixed_per_ticket
            amount = deduction.calculate_amount(tickets_sold=tickets_sold)
        
        total_deductions += amount
        deduction_details.append({
            'name': deduction.name,
            'type': deduction.type,
            'value': float(deduction.value),
            'amount': float(amount)
        })
    
    # Calculate Ticket Runner fee (commission) from this organizer's events
    ticket_runner_fee = Decimal('0.00')
    for event in events:
        commission = event.calculate_commission()
        ticket_runner_fee += Decimal(str(commission))
    
    # Add Ticket Runner fee to deductions
    total_deductions += ticket_runner_fee
    deduction_details.append({
        'name': 'Ticket Runner Fee',
        'type': 'calculated',
        'value': None,
        'amount': float(ticket_runner_fee)
    })
    
    # Calculate Organizer Net Profit
    organizer_net_profit = ticket_revenue - total_deductions
    
    return Response({
        'organizer_id': str(organizer.id),
        'organizer_name': organizer.name,
        'ticket_revenue': float(ticket_revenue),
        'deductions': deduction_details,
        'total_deductions': float(total_deductions),
        'ticket_runner_fee': float(ticket_runner_fee),
        'organizer_net_profit': float(organizer_net_profit),
        'tickets_sold': tickets_sold
    })
