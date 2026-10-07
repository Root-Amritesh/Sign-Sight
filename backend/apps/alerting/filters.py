
import django_filters
from .models import Alert

class AlertFilter(django_filters.FilterSet):
    created_after = django_filters.IsoDateTimeFilter(field_name="created_at", lookup_expr='gte')
    created_before = django_filters.IsoDateTimeFilter(field_name="created_at", lookup_expr='lte')
    
    class Meta:
        model = Alert
        fields = ['status', 'severity', 'alert_type', 'resolution', 'source_ip', 'dest_ip']
