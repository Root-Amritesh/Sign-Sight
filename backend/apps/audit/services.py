
from .models import AuditLog

def log_event(actor, action, target_type, target_id, changes=None, notes=None):
    AuditLog.objects.create(
        actor=actor,
        action=action,
        target_type=target_type,
        target_id=str(target_id),
        changes=changes or {},
        notes=notes
    )
