# Generated manually

from django.conf import settings
import django.core.validators
import django.db.models.deletion
import django.utils.timezone
import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('nfc_cards', '0003_nfccard_collector_alter_nfccard_customer_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # Create NFCCardSettings model first (this is what we need immediately)
        migrations.CreateModel(
            name='NFCCardSettings',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('first_purchase_cost', models.DecimalField(decimal_places=2, default=50.0, help_text='Cost for first-time NFC card purchase (in EGP)', max_digits=10, validators=[django.core.validators.MinValueValidator(0)])),
                ('renewal_fee', models.DecimalField(decimal_places=2, default=30.0, help_text='Fee for renewing an NFC card (in EGP)', max_digits=10, validators=[django.core.validators.MinValueValidator(0)])),
                ('deactivation_days_before_expiry', models.IntegerField(default=30, help_text='Number of days before expiry date when cards should be deactivated (0 = deactivate on expiry date)', validators=[django.core.validators.MinValueValidator(0)])),
                ('auto_deactivate_expired', models.BooleanField(default=True, help_text='Automatically deactivate cards when they expire')),
                ('card_validity_days', models.IntegerField(default=365, help_text='Number of days a card is valid from issue date', validators=[django.core.validators.MinValueValidator(1)])),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('updated_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='nfc_card_settings_updates', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'NFC Card Settings',
                'verbose_name_plural': 'NFC Card Settings',
                'db_table': 'nfc_card_settings',
            },
        ),
        # Rename fields in NFCCardTransaction
        migrations.RenameField(
            model_name='nfccardtransaction',
            old_name='card',
            new_name='nfc_card',
        ),
        migrations.RenameField(
            model_name='nfccardtransaction',
            old_name='timestamp',
            new_name='created_at',
        ),
        # Add new fields to NFCCardTransaction with default values
        migrations.AddField(
            model_name='nfccardtransaction',
            name='balance_before',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=10),
        ),
        migrations.AddField(
            model_name='nfccardtransaction',
            name='balance_after',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=10),
        ),
        # Update ordering to use created_at instead of timestamp
        migrations.AlterModelOptions(
            name='nfccardtransaction',
            options={'ordering': ['-created_at'], 'verbose_name': 'NFC Card Transaction', 'verbose_name_plural': 'NFC Card Transactions'},
        ),
    ]
