"""
URLs for Organizer Portal.
"""
from django.urls import path
from . import views

urlpatterns = [
    # Authentication
    path('login/', views.organizer_login, name='organizer-login'),
    path('verify-otp/', views.organizer_verify_otp, name='organizer-verify-otp'),
    path('logout/', views.organizer_logout, name='organizer-logout'),
    path('me/', views.organizer_me, name='organizer-me'),
    path('forgot-password/', views.organizer_forgot_password, name='organizer-forgot-password'),
    path('reset-password/', views.organizer_reset_password, name='organizer-reset-password'),
    
    # Dashboard
    path('dashboard/stats/', views.organizer_dashboard_stats, name='organizer-dashboard-stats'),
    
    # Events
    path('events/', views.organizer_events_list, name='organizer-events-list'),
    path('events/<str:event_id>/', views.organizer_event_detail, name='organizer-event-detail'),
    path('events/<uuid:event_id>/edit-request/', views.organizer_event_edit_request, name='organizer-event-edit-request'),
    
    # Payouts
    path('payouts/', views.organizer_payouts_list, name='organizer-payouts-list'),
    path('payouts/<uuid:payout_id>/', views.organizer_payout_detail, name='organizer-payout-detail'),
    path('payouts/<uuid:payout_id>/invoice/', views.organizer_payout_invoice, name='organizer-payout-invoice'),
    
    # Profile
    path('profile/', views.organizer_profile, name='organizer-profile'),
    path('profile/edit-request/', views.organizer_profile_edit_request, name='organizer-profile-edit-request'),
    path('profile/edit-requests/', views.organizer_edit_requests_list, name='organizer-edit-requests-list'),
    path('profile/change-password/', views.organizer_change_password, name='organizer-change-password'),
]

