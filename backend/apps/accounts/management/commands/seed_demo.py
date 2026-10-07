
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

class Command(BaseCommand):
    help = 'Seed demo users'

    def handle(self, *args, **kwargs):
        User = get_user_model()
        if not User.objects.filter(username='admin').exists():
            User.objects.create_superuser('admin', 'admin@example.com', 'adminpass')
            self.stdout.write(self.style.SUCCESS('Successfully created admin user'))
        if not User.objects.filter(username='analyst').exists():
            user = User.objects.create_user('analyst', 'analyst@example.com', 'analystpass')
            user.role = 'analyst'
            user.save()
            self.stdout.write(self.style.SUCCESS('Successfully created analyst user'))
