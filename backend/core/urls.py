"""
URL configuration for core app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import HomePageSectionViewSet

router = DefaultRouter()
router.register(r'home-page-sections', HomePageSectionViewSet, basename='home-page-section')

urlpatterns = [
    path('', include(router.urls)),
]

