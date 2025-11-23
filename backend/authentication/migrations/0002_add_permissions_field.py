# Generated migration for adding permissions field to AdminUser

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('authentication', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='adminuser',
            name='permissions',
            field=models.JSONField(blank=True, default=list, help_text='List of permission strings that this admin user has access to'),
        ),
    ]

