from django.contrib import admin
from .models import Alert, ModelMetadata

@admin.register(Alert)
class AlertAdmin(admin.ModelAdmin):
    list_display = ('timestamp', 'source_ip', 'dest_ip', 'attack_category', 'severity', 'confidence', 'analyst_verdict')
    list_filter = ('severity', 'attack_category', 'analyst_verdict')
    search_fields = ('source_ip', 'dest_ip')
    
    def get_readonly_fields(self, request, obj=None):
        if obj:
            return [f.name for f in self.model._meta.fields if f.name not in ('analyst_verdict', 'analyst_notes')]
        return self.readonly_fields

@admin.register(ModelMetadata)
class ModelMetadataAdmin(admin.ModelAdmin):
    list_display = ('version', 'dataset', 'trained_at', 'is_active')
    list_filter = ('is_active', 'dataset')
