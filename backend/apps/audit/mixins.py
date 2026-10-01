"""Mixin for views/serializers that auto-log changes to the audit trail."""
from apps.audit.services import log_event


class AuditMixin:
    """Mixin that automatically logs create/update/delete actions.

    Attach to any ModelViewSet to get automatic audit logging. Expects
    ``self.request.user`` to be available.
    """

    def perform_create(self, serializer):
        instance = serializer.save()
        log_event(
            actor=self.request.user,
            action=f'{instance._meta.model_name}.created',
            target_type=instance._meta.model_name,
            target_id=str(instance.pk),
        )

    def perform_update(self, serializer):
        instance = self.get_object()
        old_data = {f.name: getattr(instance, f.name) for f in instance._meta.fields}
        updated = serializer.save()
        new_data = {f.name: getattr(updated, f.name) for f in updated._meta.fields}
        changes = {k: {'old': str(old_data[k]), 'new': str(v)}
                   for k, v in new_data.items() if old_data.get(k) != v}
        if changes:
            log_event(
                actor=self.request.user,
                action=f'{updated._meta.model_name}.updated',
                target_type=updated._meta.model_name,
                target_id=str(updated.pk),
                changes=changes,
            )

    def perform_destroy(self, instance):
        log_event(
            actor=self.request.user,
            action=f'{instance._meta.model_name}.deleted',
            target_type=instance._meta.model_name,
            target_id=str(instance.pk),
        )
        instance.delete()
