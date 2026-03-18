from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0020_userprofile_role"),
    ]

    operations = [
        migrations.AddField(
            model_name="room",
            name="number_of_rooms",
            field=models.PositiveIntegerField(default=1),
        ),
    ]

