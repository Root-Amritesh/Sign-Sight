from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.accounts.urls')),
    path('api/ingest/', include('apps.ingestion.urls')),
    path('api/alerts/', include('apps.alerting.urls')),
    path('api/models/', include('apps.inference.urls')),
    path('api/metrics/', include('apps.metrics.urls')),
    path('api/audit/', include('apps.audit.urls')),
    
    # OpenAPI Schema and UIs
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/schema/swagger-ui/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/schema/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]
