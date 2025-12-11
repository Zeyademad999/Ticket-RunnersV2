"""
URLs for Merchant Portal.
"""
from django.urls import path
from . import views

urlpatterns = [
    # Authentication
    path('login/', views.merchant_login, name='merchant-login'),
    path('verify-otp/', views.merchant_verify_otp, name='merchant-verify-otp'),
    path('logout/', views.merchant_logout, name='merchant-logout'),
    path('me/', views.merchant_me, name='merchant-me'),
    
    # Dashboard
    path('dashboard-stats/', views.merchant_dashboard_stats, name='merchant-dashboard-stats'),
    
    # Card Assignment
    path('validate-card/', views.merchant_validate_card, name='merchant-validate-card'),
    path('assign-card/', views.merchant_assign_card, name='merchant-assign-card'),
    path('verify-customer-otp/', views.merchant_verify_customer_otp, name='merchant-verify-customer-otp'),
    path('verify-customer/<str:mobile>/', views.merchant_verify_customer, name='merchant-verify-customer'),
    path('send-customer-otp/', views.merchant_send_customer_otp, name='merchant-send-customer-otp'),
    path('check-customer-card-status/', views.merchant_check_customer_card_status, name='merchant-check-customer-card-status'),
    
    # Cards
    path('cards/', views.merchant_cards_list, name='merchant-cards-list'),
    
    # Settings
    path('settings/', views.merchant_settings, name='merchant-settings'),
    path('change-password/', views.merchant_change_password, name='merchant-change-password'),
    path('change-mobile/', views.merchant_change_mobile, name='merchant-change-mobile'),
    path('verify-mobile-change/', views.merchant_verify_mobile_change, name='merchant-verify-mobile-change'),
]

