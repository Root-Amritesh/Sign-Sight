from django.urls import include, path
from rest_framework.routers import DefaultRouter

from alerts.views import AlertViewSet, ModelMetadataViewSet, predict_view

app_name = "alerts"

router = DefaultRouter()
router.register(r"alerts", AlertViewSet, basename="alert")
router.register(r"models", ModelMetadataViewSet, basename="model-metadata")

urlpatterns = [
    path("", include(router.urls)),
    path("predict/", predict_view, name="predict"),
]
