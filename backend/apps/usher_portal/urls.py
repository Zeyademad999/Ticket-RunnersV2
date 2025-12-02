"""
URLs for Usher Portal.
"""
from django.urls import path
from . import views

urlpatterns = [
    # Authentication
    path('login/', views.usher_login, name='usher-login'),
    path('logout/', views.usher_logout, name='usher-logout'),
    path('me/', views.usher_me, name='usher-me'),
    
    # Events
    path('events/', views.usher_events_list, name='usher-events-list'),
    path('events/<int:event_id>/', views.usher_event_detail, name='usher-event-detail'),
    path('events/<int:event_id>/validate-assignment/', views.usher_event_validate_assignment, name='usher-event-validate-assignment'),
    path('events/<int:event_id>/status/', views.usher_event_status, name='usher-event-status'),
    
    # Scanning
    path('scan/verify-card/', views.usher_scan_verify_card, name='usher-scan-verify-card'),
    path('scan/attendee/<str:card_id>/', views.usher_scan_attendee_by_card, name='usher-scan-attendee-by-card'),
    path('scan/result/', views.usher_scan_result, name='usher-scan-result'),
    path('scan/log/', views.usher_scan_log, name='usher-scan-log'),
    path('scan/logs/', views.usher_scan_logs_list, name='usher-scan-logs-list'),
    path('scan/logs/search/', views.usher_scan_logs_search, name='usher-scan-logs-search'),
    path('scan/part-time-leave/', views.usher_part_time_leave, name='usher-part-time-leave'),
    path('scan/part-time-leave/list/', views.usher_part_time_leave_list, name='usher-part-time-leave-list'),
    path('scan/report/', views.usher_scan_report, name='usher-scan-report'),
    
    # Sync
    path('sync/attendees/', views.usher_sync_attendees, name='usher-sync-attendees'),
    path('sync/cards/', views.usher_sync_cards, name='usher-sync-cards'),
    path('sync/logs/', views.usher_sync_logs, name='usher-sync-logs'),
    path('sync/status/', views.usher_sync_status, name='usher-sync-status'),
    
    # NFC Status
    path('nfc/status/', views.usher_nfc_status, name='usher-nfc-status'),
    path('nfc/test/', views.usher_nfc_test, name='usher-nfc-test'),
    
    # Token Refresh
    path('refresh/', views.usher_refresh_token, name='usher-refresh-token'),
]

