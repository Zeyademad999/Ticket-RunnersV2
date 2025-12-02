"""
URL aliases for frontend compatibility.
These create separate router instances for direct access.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

# Import viewsets
from users.views import OrganizerViewSet, UsherViewSet, AdminUserViewSet, MerchantViewSet, OrganizerEditRequestViewSet
from finances.views import ExpenseViewSet, PayoutViewSet
from analytics.urls import dashboard_stats

# Create separate routers for each alias
organizers_router = DefaultRouter()
organizers_router.register(r'', OrganizerViewSet, basename='organizer')

ushers_router = DefaultRouter()
ushers_router.register(r'', UsherViewSet, basename='usher')

admins_router = DefaultRouter()
admins_router.register(r'', AdminUserViewSet, basename='admin')

merchants_router = DefaultRouter()
merchants_router.register(r'', MerchantViewSet, basename='merchant')

expenses_router = DefaultRouter()
expenses_router.register(r'', ExpenseViewSet, basename='expense')

payouts_router = DefaultRouter()
payouts_router.register(r'', PayoutViewSet, basename='payout')

# Create edit-requests router separately to avoid conflicts
edit_requests_router = DefaultRouter()
edit_requests_router.register(r'', OrganizerEditRequestViewSet, basename='organizer-edit-request')

# URL patterns for each alias
organizers_urlpatterns = [
    # Register edit-requests route before the main organizers router to ensure it matches first
    path('edit-requests/', include(edit_requests_router.urls)),
    path('', include(organizers_router.urls)),
]

ushers_urlpatterns = [
    path('', include(ushers_router.urls)),
]

admins_urlpatterns = [
    path('', include(admins_router.urls)),
]

merchants_urlpatterns = [
    path('', include(merchants_router.urls)),
]

expenses_urlpatterns = [
    path('', include(expenses_router.urls)),
]

payouts_urlpatterns = [
    path('', include(payouts_router.urls)),
]

