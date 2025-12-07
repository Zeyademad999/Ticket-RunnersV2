from django.contrib import admin
from .models import Expense, Payout, CompanyFinance, ProfitShare, Settlement, Deposit, ProfitWithdrawal, Deduction


@admin.register(Deduction)
class DeductionAdmin(admin.ModelAdmin):
    list_display = ['name', 'value', 'type', 'is_active', 'created_by', 'created_at']
    list_filter = ['is_active', 'type', 'created_at']
    search_fields = ['name', 'description']
    readonly_fields = ['created_at', 'updated_at']
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'description', 'is_active')
        }),
        ('Deduction Details', {
            'fields': ('type', 'value')
        }),
        ('Metadata', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def save_model(self, request, obj, form, change):
        if not change:  # Only set created_by on creation
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
