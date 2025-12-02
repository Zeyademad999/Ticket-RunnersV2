"""
URL configuration for nfc_cards app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import NFCCardViewSet

router = DefaultRouter()
router.register(r'', NFCCardViewSet, basename='nfccard')

urlpatterns = [
    path('', include(router.urls)),
]

