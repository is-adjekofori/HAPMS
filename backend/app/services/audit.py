from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog


def record(
    db: Session,
    *,
    user_id: int | None,
    action: str,
    entity_type: str,
    entity_id: int | None = None,
    description: str | None = None,
) -> AuditLog:
    """Write one audit_logs row. Called by every mutating endpoint from Phase 3
    onward (BR-6.2, BR-2.9). Does not commit — caller's transaction owns that,
    so the audit entry and the action it records land atomically together.
    """
    entry = AuditLog(
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        description=description,
    )
    db.add(entry)
    db.flush()
    return entry
