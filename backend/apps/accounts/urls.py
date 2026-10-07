
from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from . import views

urlpatterns = [
    path('login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('google/', views.google_auth, name='google_auth'),
    path('me/', views.get_me, name='auth_me'),
    path('health/', views.health_check, name='health_check'),
]
