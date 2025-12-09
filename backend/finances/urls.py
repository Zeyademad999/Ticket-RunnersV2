"""
URL configuration for finances app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ExpenseViewSet, PayoutViewSet, CompanyFinanceViewSet,
    ProfitShareViewSet, SettlementViewSet, DepositViewSet, ProfitWithdrawalViewSet, DeductionViewSet,
    OwnerViewSet,
    ticket_runner_profit, organizer_profit
)

router = DefaultRouter()
router.register(r'expenses', ExpenseViewSet, basename='expense')
router.register(r'payouts', PayoutViewSet, basename='payout')
router.register(r'company', CompanyFinanceViewSet, basename='company-finance')
router.register(r'profit-share', ProfitShareViewSet, basename='profit-share')
router.register(r'settlements', SettlementViewSet, basename='settlement')
router.register(r'deposits', DepositViewSet, basename='deposit')
router.register(r'withdrawals', ProfitWithdrawalViewSet, basename='profit-withdrawal')
router.register(r'deductions', DeductionViewSet, basename='deduction')
router.register(r'owners', OwnerViewSet, basename='owner')

urlpatterns = [
    path('', include(router.urls)),
    path('ticket-runner-profit/', ticket_runner_profit, name='ticket-runner-profit'),
    path('organizer-profit/', organizer_profit, name='organizer-profit'),
    path('organizer-profit/<uuid:organizer_id>/', organizer_profit, name='organizer-profit-detail'),
]

