"""
URL configuration for ticketrunners project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
from core.url_aliases import (
    organizers_urlpatterns, ushers_urlpatterns, admins_urlpatterns, merchants_urlpatterns,
    expenses_urlpatterns, payouts_urlpatterns
)
from analytics.urls import dashboard_stats
from payments.views import handle_payment_redirect

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # API Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/schema/swagger-ui/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/schema/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    
    # API Routes
    path('api/auth/', include('authentication.urls')),
    path('api/core/', include('core.urls')),
    path('api/events/', include('events.urls')),
    path('api/tickets/', include('tickets.urls')),
    path('api/customers/', include('customers.urls')),
    path('api/nfc-cards/', include('nfc_cards.urls')),
    path('api/venues/', include('venues.urls')),
    path('api/users/', include('users.urls')),
    path('api/finances/', include('finances.urls')),
    path('api/payments/', include('payments.urls')),
    # Also support singular 'payment' for backward compatibility with Kashier redirects
    # This handles /api/payment/redirect (singular) which Kashier may use
    path('api/payment/redirect/', handle_payment_redirect, name='payment-redirect-singular'),
    path('api/logs/', include('system.urls')),
    path('api/analytics/', include('analytics.urls')),
    
    # URL Aliases for Frontend Compatibility
    # Users endpoints - direct access (aliases)
    path('api/organizers/', include(organizers_urlpatterns)),
    path('api/ushers/', include(ushers_urlpatterns)),
    path('api/admins/', include(admins_urlpatterns)),
    path('api/merchants/', include(merchants_urlpatterns)),
    
    # Financial endpoints - direct access (aliases)
    path('api/expenses/', include(expenses_urlpatterns)),
    path('api/payouts/', include(payouts_urlpatterns)),
    
    # Dashboard endpoint - direct access (alias)
    path('api/dashboard/stats/', dashboard_stats, name='dashboard-stats-alias'),
    
    # Portal APIs
    path('api/organizer/', include('apps.organizer_portal.urls')),
    path('api/merchant/', include('apps.merchant_portal.urls')),
    path('api/usher/', include('apps.usher_portal.urls')),
    path('api/v1/', include('apps.webapp.urls')),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
