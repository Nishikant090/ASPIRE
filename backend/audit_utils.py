"""Audit logging for critical platform actions."""

from typing import Optional
from sqlalchemy.orm import Session
import auth_models as am


def log_audit(
    db: Session,
    *,
    actor_type: str,
    action: str,
    actor_id: Optional[int] = None,
    actor_email: Optional[str] = None,
    resource_type: Optional[str] = None,
    resource_id: Optional[int] = None,
    details: Optional[str] = None,
) -> None:
    entry = am.AuditLog(
        actor_type=actor_type,
        actor_id=actor_id,
        actor_email=actor_email,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        details=details,
    )
    db.add(entry)
    db.commit()
