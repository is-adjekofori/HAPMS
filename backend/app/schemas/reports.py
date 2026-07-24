from datetime import datetime

from pydantic import BaseModel


class DashboardSummary(BaseModel):
    total_rooms: int
    # §7.4: count of non-'ok' verification_items in the active session. 0 when
    # no session is active (not an error - there's simply nothing to flag).
    total_flagged_issues: int
    # §7.10/BR-8.3 (conditional): count of rooms in the active session with at
    # least one occupant missing a complete corner+shared sign-off pair.
    pending_signoff_count: int


class BaselineReportItem(BaseModel):
    baseline_id: int
    room_id: int
    hall_name: str
    room_number: str
    session_id: int
    session_name: str
    created_by: int
    created_by_name: str
    created_at: datetime
    shared_confirmed: bool


class VerificationReportItem(BaseModel):
    verification_id: int
    baseline_id: int
    room_id: int
    hall_name: str
    room_number: str
    session_id: int
    session_name: str
    flagged_count: int
    verified_at: datetime


class AuditLogEntry(BaseModel):
    id: int
    user_id: int | None
    user_name: str | None
    action: str
    entity_type: str
    entity_id: int | None
    description: str | None
    created_at: datetime
