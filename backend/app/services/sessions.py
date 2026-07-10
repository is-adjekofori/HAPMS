from sqlalchemy.orm import Session

from app.models.session import HostelSession, SessionStatus


def get_active_session(db: Session) -> HostelSession | None:
    """The single currently-active session, if one exists. Porter/Student
    actions are always associated with this session automatically - no
    manual session selection (§7.9). See app/routers/admin.py's
    create_session for why there is always at most one."""
    return db.query(HostelSession).filter(HostelSession.status == SessionStatus.ACTIVE).first()
