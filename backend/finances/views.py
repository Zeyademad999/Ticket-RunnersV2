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
from .models import Expense, Payout, CompanyFinance, ProfitShare, Settlement, Deposit, ProfitWithdrawal
from .serializers import (
    ExpenseSerializer, PayoutSerializer, CompanyFinanceSerializer,
    ProfitShareSerializer, SettlementSerializer, DepositSerializer, ProfitWithdrawalSerializer
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
