# Generated manually for adding zones, ticket_categories, and is_team_leader fields to Usher model

import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0008_add_organizer_edit_request'),
    ]

    operations = [
        migrations.AddField(
            model_name='usher',
            name='zones',
            field=models.JSONField(blank=True, default=list, help_text="List of zones this usher can work in (e.g., ['Zone A', 'Zone B'])"),
        ),
        migrations.AddField(
            model_name='usher',
            name='ticket_categories',
            field=models.JSONField(blank=True, default=list, help_text="List of ticket categories this usher can scan (e.g., ['VIP', 'Standard', 'Premium'])"),
        ),
        migrations.AddField(
            model_name='usher',
            name='is_team_leader',
            field=models.BooleanField(db_index=True, default=False, help_text='Whether this usher is a team leader'),
        ),
    ]

