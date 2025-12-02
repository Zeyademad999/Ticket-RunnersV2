"""
URLs for WebApp Portal (User-Facing).
"""
from django.urls import path
from . import views

urlpatterns = [
    # Authentication
    path('users/register/', views.user_register, name='user-register'),
    path('users/verify-otp/', views.user_verify_otp, name='user-verify-otp'),
    path('users/send-email-otp/', views.user_send_email_otp, name='user-send-email-otp'),
    path('users/verify-email-otp/', views.user_verify_email_otp, name='user-verify-email-otp'),
    path('signup/profile-image/', views.user_upload_profile_image, name='user-upload-profile-image'),
    path('users/set-password/', views.user_set_password, name='user-set-password'),
    path('users/complete-registration/', views.user_complete_registration, name='user-complete-registration'),
    path('users/validate-registration-token/', views.validate_registration_token, name='validate-registration-token'),
    path('users/save-optional-info/', views.user_save_optional_info, name='user-save-optional-info'),
    path('users/login/', views.user_login, name='user-login'),
    path('users/verify-login-otp/', views.user_verify_login_otp, name='user-verify-login-otp'),
    path('users/refresh-token/', views.user_refresh_token, name='user-refresh-token'),
    path('users/me/', views.user_me, name='user-me'),
    path('users/me/card-details/', views.user_card_details, name='user-card-details'),
    path('me/bookings/', views.user_me_bookings, name='user-me-bookings'),
    path('users/dependants-tickets/', views.user_dependants_tickets, name='user-dependants-tickets'),
    path('users/profile/', views.user_profile_update, name='user-profile-update'),
    path('users/forgot-password/request-otp/', views.user_forgot_password_request_otp, name='user-forgot-password-request-otp'),
    path('users/forgot-password/verify-otp/', views.user_verify_password_reset_otp, name='user-verify-password-reset-otp'),
    path('users/reset-password/', views.user_reset_password, name='user-reset-password'),
    path('users/change-mobile/send-current-otp/', views.user_send_current_mobile_otp, name='user-send-current-mobile-otp'),
    path('users/change-mobile/send-new-otp/', views.user_send_new_mobile_otp, name='user-send-new-mobile-otp'),
    path('users/change-mobile/verify/', views.user_verify_and_change_mobile, name='user-verify-and-change-mobile'),
    path('users/change-email/send-current-otp/', views.user_send_current_email_otp, name='user-send-current-email-otp'),
    path('users/change-email/send-new-otp/', views.user_send_new_email_otp, name='user-send-new-email-otp'),
    path('users/change-email/verify/', views.user_verify_and_change_email, name='user-verify-and-change-email'),
    
    # Public Events
    path('public/events/', views.public_events_list, name='public-events-list'),
    path('public/events/featured/', views.public_events_featured, name='public-events-featured'),
    path('public/events/categories/', views.public_events_categories, name='public-events-categories'),
    path('public/events/<int:event_id>/', views.public_event_detail, name='public-event-detail'),
    path('public/organizers/<int:organizer_id>/', views.public_organizer_detail, name='public-organizer-detail'),
    path('public/venues/', views.public_venues_list, name='public-venues-list'),
    path('public/merchant-locations/', views.public_merchant_locations, name='public-merchant-locations'),
    
    # Tickets
    path('tickets/book/', views.ticket_book, name='ticket-book'),
    path('users/tickets/', views.user_tickets_list, name='user-tickets-list'),
    path('users/tickets/<uuid:ticket_id>/', views.user_ticket_detail, name='user-ticket-detail'),
    path('users/tickets/<uuid:ticket_id>/claim/', views.user_ticket_claim, name='user-ticket-claim'),
    path('users/tickets/<uuid:ticket_id>/transfer/', views.user_ticket_transfer, name='user-ticket-transfer'),
    path('users/tickets/<uuid:ticket_id>/gift/', views.user_ticket_gift, name='user-ticket-gift'),
    path('users/tickets/<uuid:ticket_id>/qr-code/', views.user_ticket_qr_code, name='user-ticket-qr-code'),
    path('users/tickets/<uuid:ticket_id>/refund-request/', views.user_refund_request, name='user-ticket-refund-request'),
    path('users/events/<int:event_id>/checkin-status/', views.user_event_checkin_status, name='user-event-checkin-status'),
    
    # Payments
    path('payments/process/', views.payment_process, name='payment-process'),
    path('payments/confirm/', views.payment_confirm, name='payment-confirm'),
    path('payments/<uuid:transaction_id>/status/', views.payment_status, name='payment-status'),
    path('invoices/<uuid:transaction_id>/', views.invoice_download, name='invoice-download'),
    path('users/payment-history/', views.user_payment_history, name='user-payment-history'),
    
    # NFC Cards
    path('users/nfc-cards/', views.user_nfc_cards_list, name='user-nfc-cards-list'),
    path('users/nfc-cards/status/', views.user_nfc_card_status, name='user-nfc-card-status'),
    path('users/nfc-cards/request/', views.user_nfc_card_request, name='user-nfc-card-request'),
    path('users/nfc-cards/assign-collector/', views.user_nfc_card_assign_collector, name='user-nfc-card-assign-collector'),
    path('users/nfc-cards/<uuid:card_id>/reload/', views.user_nfc_card_reload, name='user-nfc-card-reload'),
    path('users/nfc-cards/<uuid:card_id>/transactions/', views.user_nfc_card_transactions, name='user-nfc-card-transactions'),
    path('users/nfc-cards/<uuid:card_id>/auto-reload-settings/', views.user_nfc_card_auto_reload_settings, name='user-nfc-card-auto-reload-settings'),
    
    # Dependents
    path('users/dependents/', views.user_dependents, name='user-dependents'),
    path('users/dependents/<uuid:dependent_id>/', views.user_dependent_detail, name='user-dependent-detail'),
    
    # Favorites
    path('users/favorites/', views.user_favorites, name='user-favorites'),
    path('users/favorites/<int:event_id>/', views.user_favorites, name='user-favorite-delete'),
    
    # Analytics
    path('users/analytics/', views.user_analytics, name='user-analytics'),
    
    # Check-in
    path('checkin/verify/', views.checkin_verify, name='checkin-verify'),
    path('checkin/nfc/', views.checkin_nfc, name='checkin-nfc'),
    
    # Admin utilities
    path('admin/find-customer-by-phone/', views.find_customer_by_phone_api, name='admin-find-customer-by-phone'),
]

