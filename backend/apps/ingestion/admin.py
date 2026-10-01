from django.contrib import admin
from .models import TrafficRecord

@admin.register(TrafficRecord)
class TrafficRecordAdmin(admin.ModelAdmin):
    list_display = ('id', 'protocol_type', 'service', 'status', 'ingested_at')
    list_filter = ('status', 'protocol_type')
    search_fields = ('source_ip', 'dest_ip')
    readonly_fields = ('id', 'raw_features', 'ingested_at')
