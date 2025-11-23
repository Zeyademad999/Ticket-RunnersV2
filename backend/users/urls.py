"""
URL configuration for users app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OrganizerViewSet, UsherViewSet, AdminUserViewSet, MerchantViewSet, MerchantLocationViewSet, OrganizerEditRequestViewSet

router = DefaultRouter()
router.register(r'organizers', OrganizerViewSet, basename='organizer')
router.register(r'organizers/edit-requests', OrganizerEditRequestViewSet, basename='organizer-edit-request')
router.register(r'ushers', UsherViewSet, basename='usher')
router.register(r'admins', AdminUserViewSet, basename='admin')
router.register(r'merchants', MerchantViewSet, basename='merchant')
router.register(r'merchant-locations', MerchantLocationViewSet, basename='merchant-location')

urlpatterns = [
    path('', include(router.urls)),
]

