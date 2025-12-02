"""
URL configuration for system app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SystemLogViewSet, CheckinLogViewSet

router = DefaultRouter()
router.register(r'system', SystemLogViewSet, basename='system-log')
router.register(r'checkin', CheckinLogViewSet, basename='checkin-log')

urlpatterns = [
    path('', include(router.urls)),
]

