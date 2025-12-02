"""
Views and URLs for analytics app.
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Count, Sum, Q
from django.core.cache import cache
from django.urls import path
from django.conf import settings
from events.models import Event
from tickets.models import Ticket
from customers.models import Customer
from nfc_cards.models import NFCCard


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    """
    Get dashboard statistics.
    GET /api/analytics/dashboard/stats/
    """
    cache_key = 'dashboard_stats'
    stats = cache.get(cache_key)
    
    if not stats:
        # Calculate total revenue from tickets
        total_revenue = float(Ticket.objects.filter(status__in=['valid', 'used']).aggregate(Sum('price'))['price__sum'] or 0)
        
        # Calculate admin revenue (cut_commissions) from events
        # Sum up commission from all events
        cut_commissions = 0.0
        events = Event.objects.all()
        for event in events:
            try:
                commission = event.calculate_commission()
                cut_commissions += float(commission)
            except Exception:
                # Skip events that can't calculate commission
                pass
        
        # Calculate card sales (revenue from NFC card purchases)
        # Assuming card sales are tracked separately, for now use 0 or calculate from card transactions
        card_sales = 0.0
        try:
            from nfc_cards.models import NFCCardTransaction
            card_sales = float(NFCCardTransaction.objects.filter(
                transaction_type='purchase'
            ).aggregate(Sum('amount'))['amount__sum'] or 0)
        except Exception:
            pass
        
        # Calculate gross profit (total revenue - costs, simplified as total revenue for now)
        gross_profit = total_revenue
        
        # Calculate pending and completed payouts (from finances if available)
        pending_payouts = 0.0
        completed_payouts = 0.0
        try:
            from finances.models import Payout
            pending_payouts = float(Payout.objects.filter(status='pending').aggregate(Sum('amount'))['amount__sum'] or 0)
            completed_payouts = float(Payout.objects.filter(status='completed').aggregate(Sum('amount'))['amount__sum'] or 0)
        except Exception:
            pass
        
        # Calculate user stats
        total_customers = Customer.objects.count()
        active_users = Customer.objects.filter(status='active').count()
        inactive_users = Customer.objects.filter(status='inactive').count()
        recurrent_users = Customer.objects.filter(is_recurrent=True).count()
        
        # Estimate total visitors (can be calculated from analytics if available)
        # For now, use a multiplier of registered users or track separately
        total_visitors = total_customers  # Simplified: assume each registered user is a visitor
        
        # Calculate card stats
        total_cards = NFCCard.objects.count()
        active_cards = NFCCard.objects.filter(status='active').count()
        inactive_cards = NFCCard.objects.filter(status='inactive').count()
        expired_cards = NFCCard.objects.filter(status='expired').count()
        
        # Calculate stats
        stats = {
            'total_events': Event.objects.count(),
            'total_tickets_sold': Ticket.objects.filter(status__in=['valid', 'used']).count(),
            'total_attendees': Ticket.objects.filter(status='used').count(),
            'total_revenue': total_revenue,
            'cut_commissions': cut_commissions,
            'pending_payouts': pending_payouts,
            'completed_payouts': completed_payouts,
            'card_sales': card_sales,
            'gross_profit': gross_profit,
            'total_visitors': total_visitors,
            'registered_users': total_customers,
            'active_users': active_users,
            'inactive_users': inactive_users,
            'recurrent_users': recurrent_users,
            'total_cards': total_cards,
            'active_cards': active_cards,
            'inactive_cards': inactive_cards,
            'expired_cards': expired_cards,
        }
        
        cache.set(cache_key, stats, settings.CACHE_TIMEOUT_DASHBOARD_STATS)
    
    return Response(stats)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def revenue_analytics(request):
    """
    Get revenue analytics.
    GET /api/analytics/revenue/
    Query params: date_from, date_to, group_by (month/week/day)
    """
    from datetime import datetime, timedelta
    from django.db.models import Sum
    
    date_from = request.query_params.get('date_from')
    date_to = request.query_params.get('date_to')
    group_by = request.query_params.get('group_by', 'month')
    
    # Get tickets in date range
    tickets = Ticket.objects.filter(status__in=['valid', 'used'])
    
    if date_from:
        tickets = tickets.filter(purchase_date__gte=date_from)
    if date_to:
        tickets = tickets.filter(purchase_date__lte=date_to)
    
    # Group by month
    if group_by == 'month':
        revenue_data = tickets.extra(
            select={'month': "strftime('%%Y-%%m', purchase_date)"}
        ).values('month').annotate(
            revenue=Sum('price'),
            count=Count('id')
        ).order_by('month')
    else:
        # Default: monthly grouping
        revenue_data = tickets.extra(
            select={'month': "strftime('%%Y-%%m', purchase_date)"}
        ).values('month').annotate(
            revenue=Sum('price'),
            count=Count('id')
        ).order_by('month')
    
    return Response(list(revenue_data))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_growth_analytics(request):
    """
    Get user growth analytics.
    GET /api/analytics/users/
    Query params: date_from, date_to
    """
    from django.db.models import Count
    
    date_from = request.query_params.get('date_from')
    date_to = request.query_params.get('date_to')
    
    # Get customers in date range
    customers = Customer.objects.all()
    
    if date_from:
        customers = customers.filter(registration_date__gte=date_from)
    if date_to:
        customers = customers.filter(registration_date__lte=date_to)
    
    # Group by month
    growth_data = customers.extra(
        select={'month': "strftime('%%Y-%%m', registration_date)"}
    ).values('month').annotate(
        registered=Count('id'),
        active=Count('id', filter=Q(status='active'))
    ).order_by('month')
    
    return Response(list(growth_data))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def card_status_analytics(request):
    """
    Get NFC card status distribution.
    GET /api/analytics/cards/
    """
    stats = NFCCard.objects.values('status').annotate(count=Count('id'))
    return Response(list(stats))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def event_categories_analytics(request):
    """
    Get event categories distribution.
    GET /api/analytics/events/
    """
    from events.models import EventCategory
    stats = Event.objects.values('category__name').annotate(count=Count('id'))
    return Response(list(stats))


urlpatterns = [
    path('dashboard/stats/', dashboard_stats, name='dashboard-stats'),
    path('revenue/', revenue_analytics, name='revenue-analytics'),
    path('users/', user_growth_analytics, name='user-growth-analytics'),
    path('cards/', card_status_analytics, name='card-status-analytics'),
    path('events/', event_categories_analytics, name='event-categories-analytics'),
]

