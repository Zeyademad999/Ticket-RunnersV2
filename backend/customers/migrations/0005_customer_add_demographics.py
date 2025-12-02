from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('customers', '0004_customer_national_id_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='customer',
            name='date_of_birth',
            field=models.DateField(blank=True, help_text='Date of birth', null=True),
        ),
        migrations.AddField(
            model_name='customer',
            name='gender',
            field=models.CharField(blank=True, choices=[('male', 'Male'), ('female', 'Female'), ('other', 'Other')], help_text='Gender identity', max_length=20, null=True),
        ),
        migrations.AddField(
            model_name='customer',
            name='nationality',
            field=models.CharField(blank=True, help_text='Customer nationality', max_length=100, null=True),
        ),
    ]

