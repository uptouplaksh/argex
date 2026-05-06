from sqlalchemy.orm import Session
from backend.app.models.audit_log import AuditLog
from typing import Optional, Any

def log_action(
    db: Session,
    user_id: Optional[int],
    action_type: str,
    entity_type: Optional[str] = None,
    entity_id: Optional[int] = None,
    details: Optional[dict[str, Any]] = None,
):
    """
    Logs an action in the audit log.
    """
    audit_log_entry = AuditLog(
        user_id=user_id,
        action_type=action_type,
        entity_type=entity_type,
        entity_id=entity_id,
        details=details,
    )
    db.add(audit_log_entry)
    db.commit()
