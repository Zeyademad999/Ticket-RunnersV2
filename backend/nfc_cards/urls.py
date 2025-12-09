"""
URL configuration for nfc_cards app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import NFCCardViewSet, nfc_card_settings

router = DefaultRouter()
router.register(r'', NFCCardViewSet, basename='nfccard')

urlpatterns = [
    path('settings/', nfc_card_settings, name='nfc-card-settings'),
    path('', include(router.urls)),
]

