"""
URLs for payments app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PaymentTransactionViewSet,
    initialize_payment,
    handle_payment_redirect,
    handle_payment_webhook
)

urlpatterns = [
    # Put specific routes BEFORE the router to avoid conflicts
    path('initialize/', initialize_payment, name='initialize-payment'),
    path('redirect/', handle_payment_redirect, name='payment-redirect'),
    path('webhook/', handle_payment_webhook, name='payment-webhook'),
]

# Register router AFTER specific routes
router = DefaultRouter()
router.register(r'', PaymentTransactionViewSet, basename='payment')
urlpatterns += [path('', include(router.urls))]

