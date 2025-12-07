"""
Serializers for finances app.
"""
from rest_framework import serializers
from .models import Expense, Payout, CompanyFinance, ProfitShare, Settlement, Deposit, ProfitWithdrawal, Deduction


class ExpenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Expense
        fields = '__all__'
        read_only_fields = ['id', 'created_at']


class PayoutSerializer(serializers.ModelSerializer):
    organizer_name = serializers.CharField(source='organizer.name', read_only=True)
    
    class Meta:
        model = Payout
        fields = '__all__'
        read_only_fields = ['id', 'created_at']
    
    def update(self, instance, validated_data):
        """Override update to set processed_at when status changes to completed."""
        status = validated_data.get('status', instance.status)
        
        # If status is being changed to completed and processed_at is not set, set it to now
        if status == 'completed' and not instance.processed_at:
            from django.utils import timezone
            validated_data['processed_at'] = timezone.now()
        
        return super().update(instance, validated_data)


class CompanyFinanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompanyFinance
        fields = '__all__'
        read_only_fields = ['id', 'created_at']


class ProfitShareSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProfitShare
        fields = '__all__'
        read_only_fields = ['id', 'created_at']


class SettlementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Settlement
        fields = '__all__'
        read_only_fields = ['id', 'created_at']


class DepositSerializer(serializers.ModelSerializer):
    class Meta:
        model = Deposit
        fields = '__all__'
        read_only_fields = ['id', 'created_at']


class ProfitWithdrawalSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProfitWithdrawal
        fields = '__all__'
        read_only_fields = ['id', 'created_at']


class DeductionSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.username', read_only=True, allow_null=True)
    
    class Meta:
        model = Deduction
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']

