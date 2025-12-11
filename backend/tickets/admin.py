from django.contrib import admin
from .models import TicketMarketplaceListing, MarketplaceSettings


@admin.register(TicketMarketplaceListing)
class TicketMarketplaceListingAdmin(admin.ModelAdmin):
    list_display = ['ticket', 'customer', 'seller_price', 'listed_at', 'is_active']
    list_filter = ['is_active', 'listed_at']
    search_fields = ['ticket__ticket_number', 'customer__name', 'customer__mobile_number']
    readonly_fields = ['id', 'created_at', 'listed_at']


@admin.register(MarketplaceSettings)
class MarketplaceSettingsAdmin(admin.ModelAdmin):
    list_display = ['max_allowed_price', 'updated_at', 'updated_by']
    readonly_fields = ['updated_at']
    
    def has_add_permission(self, request):
        # Only allow one settings instance
        return not MarketplaceSettings.objects.exists()
    
    def has_delete_permission(self, request, obj=None):
        # Don't allow deletion of settings
        return False
