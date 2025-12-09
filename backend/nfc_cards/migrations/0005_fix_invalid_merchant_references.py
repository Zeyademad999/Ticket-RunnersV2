# Generated manually to fix data integrity issues

from django.db import migrations


def fix_invalid_merchant_references(apps, schema_editor):
    """Set merchant_id to NULL for cards with invalid merchant references"""
    NFCCard = apps.get_model('nfc_cards', 'NFCCard')
    MerchantLocation = apps.get_model('users', 'MerchantLocation')
    
    # Get all valid merchant IDs
    valid_merchant_ids = set(MerchantLocation.objects.values_list('id', flat=True))
    
    # Find cards with invalid merchant references
    cards_with_merchants = NFCCard.objects.filter(merchant_id__isnull=False)
    fixed_count = 0
    
    for card in cards_with_merchants:
        if card.merchant_id not in valid_merchant_ids:
            card.merchant_id = None
            card.save(update_fields=['merchant_id'])
            fixed_count += 1
    
    if fixed_count > 0:
        print(f"Fixed {fixed_count} NFC cards with invalid merchant references")


def reverse_fix(apps, schema_editor):
    """Reverse migration - nothing to do"""
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('nfc_cards', '0004_nfccardsettings_rename_nfccardtransaction_fields'),
        ('users', '0009_add_usher_zones_ticket_categories_team_leader'),
    ]

    operations = [
        migrations.RunPython(fix_invalid_merchant_references, reverse_fix),
    ]

