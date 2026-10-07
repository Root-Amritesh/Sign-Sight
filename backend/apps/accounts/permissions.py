"""Custom DRF permission classes for accounts."""
from rest_framework import permissions


class IsAnalyst(permissions.IsAuthenticated):
    """Allows access to analysts and admins."""
    def has_permission(self, request, view):
        return super().has_permission(request, view) and request.user.role in ['analyst', 'admin']


class IsAdmin(permissions.IsAuthenticated):
    """Allows access to admins only."""
    def has_permission(self, request, view):
        return super().has_permission(request, view) and request.user.role == 'admin'
