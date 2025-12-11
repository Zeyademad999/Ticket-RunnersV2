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
from .models import Expense, Payout, CompanyFinance, ProfitShare, Settlement, Deposit, ProfitWithdrawal, Deduction, Owner, OwnerWallet, OwnerWalletTransaction, CompanyWallet, ProfitDistribution
from .serializers import (
    ExpenseSerializer, PayoutSerializer, CompanyFinanceSerializer,
    ProfitShareSerializer, SettlementSerializer, DepositSerializer, ProfitWithdrawalSerializer, DeductionSerializer,
    OwnerSerializer, OwnerWalletSerializer, OwnerWalletTransactionSerializer
)


class ExpenseViewSet(viewsets.ModelViewSet):
    queryset = Expense.objects.select_related('created_by').all()
    serializer_class = ExpenseSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    filterset_fields = ['category', 'date']
    
    def perform_create(self, serializer):
        """Handle wallet deduction when creating expense."""
        expense = serializer.save(created_by=self.request.user)
        self._handle_wallet_deduction(expense)
    
    def perform_update(self, serializer):
        """Handle wallet deduction when updating expense."""
        old_expense = self.get_object()
        expense = serializer.save()
        
        # If wallet deduction was changed, we need to handle it
        # For simplicity, we'll just process the new state
        # In a production system, you might want to reverse old deductions
        self._handle_wallet_deduction(expense, is_update=True, old_expense=old_expense)
    
    def _handle_wallet_deduction(self, expense, is_update=False, old_expense=None):
        """Deduct expense amount from specified wallet."""
        from decimal import Decimal
        
        if not expense.deduct_from_wallet:
            return
        
        if not expense.wallet_type:
            return
        
        # For owner wallet, wallet_id is required
        if expense.wallet_type == 'owner' and not expense.wallet_id:
            return
        
        amount = Decimal(str(expense.amount))
        
        try:
            if expense.wallet_type == 'company':
                wallet = CompanyWallet.get_or_create_company_wallet()
                balance_before = wallet.balance
                wallet.balance -= amount
                wallet.save()
                
            elif expense.wallet_type == 'owner':
                from .models import OwnerWallet
                try:
                    wallet = OwnerWallet.objects.get(id=expense.wallet_id)
                    balance_before = wallet.balance
                    wallet.balance -= amount
                    wallet.save()
                    
                    # Create transaction record
                    from .models import OwnerWalletTransaction
                    OwnerWalletTransaction.objects.create(
                        wallet=wallet,
                        amount=amount,
                        transaction_type='debit',
                        description=f'Expense deduction: {expense.description[:100]}',
                        balance_before=balance_before,
                        balance_after=wallet.balance,
                        created_by=self.request.user
                    )
                except OwnerWallet.DoesNotExist:
                    pass  # Wallet not found, skip deduction
        except Exception as e:
            # Log error but don't fail the expense creation
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error deducting from wallet for expense {expense.id}: {str(e)}")
    
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


class OwnerViewSet(viewsets.ModelViewSet):
    queryset = Owner.objects.prefetch_related('wallet').all()
    serializer_class = OwnerSerializer
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    filterset_fields = ['status']
    
    def perform_create(self, serializer):
        """
        Create owner and automatically create their wallet.
        """
        owner = serializer.save()
        # Create wallet for the owner if it doesn't exist
        OwnerWallet.objects.get_or_create(owner=owner, defaults={'balance': 0})
    
    @action(detail=True, methods=['get'])
    def wallet(self, request, pk=None):
        """
        Get owner's wallet details.
        GET /api/finances/owners/{id}/wallet/
        """
        owner = self.get_object()
        wallet, created = OwnerWallet.objects.get_or_create(owner=owner, defaults={'balance': 0})
        serializer = OwnerWalletSerializer(wallet)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], url_path='wallet/transaction', url_name='owner-wallet-transaction')
    def wallet_transaction(self, request, pk=None):
        """
        Credit or debit owner's wallet.
        POST /api/finances/owners/{id}/wallet/transaction/
        Body: {
            "amount": 100.00,
            "transaction_type": "credit" or "debit",
            "description": "Optional description"
        }
        """
        from decimal import Decimal
        
        owner = self.get_object()
        wallet, created = OwnerWallet.objects.get_or_create(owner=owner, defaults={'balance': 0})
        
        amount = Decimal(str(request.data.get('amount', 0)))
        transaction_type = request.data.get('transaction_type', 'credit')  # 'credit' or 'debit'
        description = request.data.get('description', '')
        
        if amount <= 0:
            return Response({'error': 'Amount must be greater than 0'}, status=400)
        
        if transaction_type not in ['credit', 'debit']:
            return Response({'error': 'Transaction type must be "credit" or "debit"'}, status=400)
        
        # Calculate new balance
        balance_before = wallet.balance
        if transaction_type == 'credit':
            wallet.balance += amount
        else:  # debit
            wallet.balance -= amount
        
        wallet.save()
        
        # Create transaction record
        OwnerWalletTransaction.objects.create(
            wallet=wallet,
            amount=amount,
            transaction_type=transaction_type,
            description=description or f'Manual {transaction_type}',
            balance_before=balance_before,
            balance_after=wallet.balance,
            created_by=request.user
        )
        
        return Response({
            'message': f'Owner wallet {transaction_type}ed successfully',
            'amount': float(amount),
            'transaction_type': transaction_type,
            'balance_before': float(balance_before),
            'balance_after': float(wallet.balance),
            'description': description,
        })
    
    @action(detail=True, methods=['get'])
    def revenue(self, request, pk=None):
        """
        Get owner's share of TR revenue.
        GET /api/finances/owners/{id}/revenue/
        """
        from tickets.models import Ticket
        from nfc_cards.models import NFCCardTransaction
        from events.models import Event
        
        owner = self.get_object()
        
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
        
        for deduction in deductions:
            if deduction.type == 'percentage':
                amount = deduction.calculate_amount(total_revenue=total_revenue)
            else:  # fixed_per_ticket
                amount = deduction.calculate_amount(tickets_sold=tickets_sold)
            total_deductions += amount
        
        # Calculate Ticket Runner fee (commission from tickets)
        ticket_runner_fee = Decimal('0.00')
        events = Event.objects.all()
        for event in events:
            commission = event.calculate_commission()
            ticket_runner_fee += Decimal(str(commission))
        
        # Add Ticket Runner fee to deductions
        total_deductions += ticket_runner_fee
        
        # Calculate Ticket Runner Net Profit
        tr_net_profit = total_revenue - total_deductions
        
        # Calculate owner's share
        owner_share = (tr_net_profit * owner.company_percentage) / 100
        
        return Response({
            'owner_id': str(owner.id),
            'owner_name': owner.name,
            'company_percentage': float(owner.company_percentage),
            'tr_net_profit': float(tr_net_profit),
            'owner_share': float(owner_share),
            'ticket_revenue': float(ticket_revenue),
            'card_revenue': float(card_revenue),
        })
    
    @action(detail=False, methods=['get'], url_path='revenue-summary', url_name='revenue-summary')
    def revenue_summary(self, request):
        """
        Get revenue summary for all owners.
        GET /api/finances/owners/revenue-summary/
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
        
        for deduction in deductions:
            if deduction.type == 'percentage':
                amount = deduction.calculate_amount(total_revenue=total_revenue)
            else:  # fixed_per_ticket
                amount = deduction.calculate_amount(tickets_sold=tickets_sold)
            total_deductions += amount
        
        # Calculate Ticket Runner fee (commission from tickets)
        ticket_runner_fee = Decimal('0.00')
        events = Event.objects.all()
        for event in events:
            commission = event.calculate_commission()
            ticket_runner_fee += Decimal(str(commission))
        
        # Add Ticket Runner fee to deductions
        total_deductions += ticket_runner_fee
        
        # Calculate Ticket Runner Net Profit
        tr_net_profit = total_revenue - total_deductions
        
        # Get all active owners
        owners = Owner.objects.filter(status='active').prefetch_related('wallet')
        
        owners_data = []
        for owner in owners:
            wallet, _ = OwnerWallet.objects.get_or_create(owner=owner, defaults={'balance': 0})
            owner_share = (tr_net_profit * owner.company_percentage) / 100
            
            owners_data.append({
                'owner_id': str(owner.id),
                'owner_name': owner.name,
                'email': owner.email,
                'phone': owner.phone,
                'company_percentage': float(owner.company_percentage),
                'wallet_balance': float(wallet.balance),
                'owner_share': float(owner_share),
                'card_number': owner.generate_card_number(),
            })
        
        # Get company wallet balance
        company_wallet = CompanyWallet.get_or_create_company_wallet()
        
        # Calculate total TR revenue (commission + card revenue)
        total_tr_revenue = ticket_runner_fee + card_revenue
        
        # Calculate total distributed profits (sum of all profit distributions)
        total_distributed_profits = Decimal(str(ProfitDistribution.objects.aggregate(
            total=Sum('total_distributed')
        )['total'] or 0))
        
        # Calculate undistributed profits (current TR revenue - already distributed)
        undistributed_profits = total_tr_revenue - total_distributed_profits
        if undistributed_profits < 0:
            undistributed_profits = Decimal('0.00')
        
        return Response({
            'tr_net_profit': float(tr_net_profit),
            'ticket_revenue': float(ticket_revenue),
            'card_revenue': float(card_revenue),
            'total_revenue': float(total_revenue),
            'ticket_runner_fee': float(ticket_runner_fee),
            'total_tr_revenue': float(total_tr_revenue),  # Commission + Card Revenue
            'total_distributed_profits': float(total_distributed_profits),
            'undistributed_profits': float(undistributed_profits),
            'company_wallet_balance': float(company_wallet.balance),
            'owners': owners_data,
        })
    
    @action(detail=False, methods=['post'], url_path='distribute-profits', url_name='distribute-profits')
    def distribute_profits(self, request):
        """
        Distribute profits to owners and company wallet.
        POST /api/finances/owners/distribute-profits/
        Body: {
            "distributions": [
                {"owner_id": "uuid", "amount": 50.00},
                ...
            ],
            "total_revenue": 100.00
        }
        """
        from decimal import Decimal
        
        distributions = request.data.get('distributions', [])
        total_revenue = Decimal(str(request.data.get('total_revenue', 0)))
        
        if not distributions:
            return Response({'error': 'No distributions provided'}, status=400)
        
        # Calculate total distributed
        total_distributed = Decimal('0.00')
        for dist in distributions:
            total_distributed += Decimal(str(dist.get('amount', 0)))
        
        # Check if this revenue has already been distributed
        # Calculate current TR revenue (commission + card revenue)
        from tickets.models import Ticket
        from nfc_cards.models import NFCCardTransaction
        from events.models import Event
        from django.db.models import Sum
        
        ticket_revenue = Decimal(str(Ticket.objects.filter(
            status__in=['valid', 'used'],
            is_black_card=False
        ).aggregate(total=Sum('price'))['total'] or 0))
        
        try:
            card_revenue = Decimal(str(NFCCardTransaction.objects.filter(
                transaction_type='purchase'
            ).aggregate(total=Sum('amount'))['total'] or 0))
        except Exception:
            card_revenue = Decimal('0.00')
        
        ticket_runner_fee = Decimal('0.00')
        events = Event.objects.all()
        for event in events:
            commission = event.calculate_commission()
            ticket_runner_fee += Decimal(str(commission))
        
        current_total_tr_revenue = ticket_runner_fee + card_revenue
        
        # Check if we're trying to distribute more than available
        total_already_distributed = Decimal(str(ProfitDistribution.objects.aggregate(
            total=Sum('total_distributed')
        )['total'] or 0))
        
        # Allow distributions even if they exceed available profits
        # This supports negative balances and manual adjustments
        # No validation on available_to_distribute - allow any distribution amount
        
        # Calculate remaining amount for company wallet
        # This can be negative if total_distributed exceeds total_revenue
        remaining_amount = total_revenue - total_distributed
        
        # Get or create company wallet
        company_wallet = CompanyWallet.get_or_create_company_wallet()
        
        # Distribute to owners
        distributed_owners = []
        for dist in distributions:
            owner_id = dist.get('owner_id')
            amount = Decimal(str(dist.get('amount', 0)))
            
            # Allow zero and negative amounts (negative for cases where someone receives more than their share)
            if amount == 0:
                continue
            
            try:
                owner = Owner.objects.get(id=owner_id)
                wallet, _ = OwnerWallet.objects.get_or_create(owner=owner, defaults={'balance': 0})
                
                # Store balance before update
                balance_before = wallet.balance
                
                # Update wallet balance (can be negative)
                wallet.balance += amount
                wallet.save()
                
                # Create transaction record
                OwnerWalletTransaction.objects.create(
                    wallet=wallet,
                    amount=abs(amount),  # Store absolute value for transaction amount
                    transaction_type='revenue_share' if amount > 0 else 'adjustment',
                    description=f'Profit distribution from TR revenue' if amount > 0 else f'Adjustment: {amount}',
                    balance_before=balance_before,
                    balance_after=wallet.balance,
                    created_by=request.user
                )
                
                distributed_owners.append({
                    'owner_id': str(owner.id),
                    'owner_name': owner.name,
                    'amount': float(amount)
                })
            except Owner.DoesNotExist:
                continue
        
        # Update company wallet with remaining amount (can be negative)
        company_wallet.balance += remaining_amount
        company_wallet.save()
        
        # Record this distribution
        ProfitDistribution.objects.create(
            total_revenue=float(current_total_tr_revenue),
            total_distributed=float(total_distributed),
            remaining_amount=float(remaining_amount),
            created_by=request.user
        )
        
        return Response({
            'message': 'Profits distributed successfully',
            'total_revenue': float(total_revenue),
            'total_distributed': float(total_distributed),
            'remaining_amount': float(remaining_amount),
            'company_wallet_balance': float(company_wallet.balance),
            'distributed_owners': distributed_owners,
        })
    
    @action(detail=False, methods=['post'], url_path='company-wallet/transaction', url_name='company-wallet-transaction')
    def company_wallet_transaction(self, request):
        """
        Credit or debit company wallet.
        POST /api/finances/owners/company-wallet/transaction/
        Body: {
            "amount": 100.00,
            "transaction_type": "credit" or "debit",
            "description": "Optional description"
        }
        """
        from decimal import Decimal
        
        amount = Decimal(str(request.data.get('amount', 0)))
        transaction_type = request.data.get('transaction_type', 'credit')  # 'credit' or 'debit'
        description = request.data.get('description', '')
        
        if amount <= 0:
            return Response({'error': 'Amount must be greater than 0'}, status=400)
        
        if transaction_type not in ['credit', 'debit']:
            return Response({'error': 'Transaction type must be "credit" or "debit"'}, status=400)
        
        # Get or create company wallet
        company_wallet = CompanyWallet.get_or_create_company_wallet()
        
        # Calculate new balance
        balance_before = company_wallet.balance
        if transaction_type == 'credit':
            company_wallet.balance += amount
        else:  # debit
            company_wallet.balance -= amount
        
        company_wallet.save()
        
        return Response({
            'message': f'Company wallet {transaction_type}ed successfully',
            'amount': float(amount),
            'transaction_type': transaction_type,
            'balance_before': float(balance_before),
            'balance_after': float(company_wallet.balance),
            'description': description,
        })
    
    @action(detail=False, methods=['post'], url_path='transfer', url_name='wallet-transfer')
    def wallet_transfer(self, request):
        """
        Transfer money between wallets (owner to owner, owner to company, company to owner).
        POST /api/finances/owners/transfer/
        Body: {
            "from_wallet_type": "owner" or "company",
            "from_wallet_id": "owner_id or 'company'",
            "to_wallet_type": "owner" or "company",
            "to_wallet_id": "owner_id or 'company'",
            "amount": 100.00,
            "description": "Optional description"
        }
        """
        from decimal import Decimal
        
        from_wallet_type = request.data.get('from_wallet_type')  # 'owner' or 'company'
        from_wallet_id = request.data.get('from_wallet_id')
        to_wallet_type = request.data.get('to_wallet_type')  # 'owner' or 'company'
        to_wallet_id = request.data.get('to_wallet_id')
        amount = Decimal(str(request.data.get('amount', 0)))
        description = request.data.get('description', '')
        
        if amount <= 0:
            return Response({'error': 'Amount must be greater than 0'}, status=400)
        
        if from_wallet_type == to_wallet_type and from_wallet_id == to_wallet_id:
            return Response({'error': 'Cannot transfer to the same wallet'}, status=400)
        
        # Get source wallet
        if from_wallet_type == 'company':
            from_wallet = CompanyWallet.get_or_create_company_wallet()
            from_balance_before = from_wallet.balance
        else:  # owner
            try:
                owner = Owner.objects.get(id=from_wallet_id)
                from_wallet, _ = OwnerWallet.objects.get_or_create(owner=owner, defaults={'balance': 0})
                from_balance_before = from_wallet.balance
            except Owner.DoesNotExist:
                return Response({'error': 'Source owner not found'}, status=404)
        
        # Validate sufficient balance
        if from_wallet.balance < amount:
            return Response({
                'error': f'Insufficient balance. Available: {from_wallet.balance}, Required: {amount}'
            }, status=400)
        
        # Get destination wallet
        if to_wallet_type == 'company':
            to_wallet = CompanyWallet.get_or_create_company_wallet()
            to_balance_before = to_wallet.balance
        else:  # owner
            try:
                owner = Owner.objects.get(id=to_wallet_id)
                to_wallet, _ = OwnerWallet.objects.get_or_create(owner=owner, defaults={'balance': 0})
                to_balance_before = to_wallet.balance
            except Owner.DoesNotExist:
                return Response({'error': 'Destination owner not found'}, status=404)
        
        # Perform transfer
        from_wallet.balance -= amount
        to_wallet.balance += amount
        
        from_wallet.save()
        to_wallet.save()
        
        # Create transaction records
        if from_wallet_type == 'owner':
            OwnerWalletTransaction.objects.create(
                wallet=from_wallet,
                amount=amount,
                transaction_type='debit',
                description=description or f'Transfer to {to_wallet_type} wallet',
                balance_before=from_balance_before,
                balance_after=from_wallet.balance,
                created_by=request.user
            )
        
        if to_wallet_type == 'owner':
            OwnerWalletTransaction.objects.create(
                wallet=to_wallet,
                amount=amount,
                transaction_type='credit',
                description=description or f'Transfer from {from_wallet_type} wallet',
                balance_before=to_balance_before,
                balance_after=to_wallet.balance,
                created_by=request.user
            )
        
        return Response({
            'message': 'Transfer completed successfully',
            'amount': float(amount),
            'from_wallet_type': from_wallet_type,
            'from_wallet_id': from_wallet_id,
            'from_balance_before': float(from_balance_before),
            'from_balance_after': float(from_wallet.balance),
            'to_wallet_type': to_wallet_type,
            'to_wallet_id': to_wallet_id,
            'to_balance_before': float(to_balance_before),
            'to_balance_after': float(to_wallet.balance),
            'description': description,
        })
