"""Pending-Action Indicators (Phase 10, conditional per TECHNICAL_MVP.md §7.10):
derived purely from the absence of expected sign_offs rows - no new tables."""

from sqlalchemy.orm import Session

from app.models.room_inventory_baseline import RoomInventoryBaseline
from app.models.session import HostelSession
from app.models.sign_off import SignOff
from app.models.student_room_allocation import AllocationStatus, StudentRoomAllocation


def has_complete_signoff_pair(db: Session, baseline_id: int, student_id: int) -> bool:
    """True once this student has signed off both 'corner' and 'shared' for
    this baseline (either status counts - §7.7)."""
    groups = {
        group
        for (group,) in db.query(SignOff.sign_off_group)
        .filter(SignOff.baseline_id == baseline_id, SignOff.student_id == student_id)
        .all()
    }
    return {"corner", "shared"}.issubset(groups)


def pending_signoff_room_count(db: Session, active_session: HostelSession) -> int:
    """BR-8.3: count of rooms in the active session where at least one current
    occupant is missing a complete corner+shared sign-off pair. Rooms with no
    baseline yet, or no current occupants, don't count - there's nothing to
    sign off against."""
    baseline_rows = (
        db.query(RoomInventoryBaseline.id, RoomInventoryBaseline.room_id)
        .filter(RoomInventoryBaseline.session_id == active_session.id)
        .all()
    )

    pending_rooms = 0
    for baseline_id, room_id in baseline_rows:
        occupant_ids = [
            student_id
            for (student_id,) in db.query(StudentRoomAllocation.student_id)
            .filter(
                StudentRoomAllocation.room_id == room_id,
                StudentRoomAllocation.session_id == active_session.id,
                StudentRoomAllocation.status == AllocationStatus.ACTIVE,
            )
            .all()
        ]
        if not occupant_ids:
            continue
        if any(
            not has_complete_signoff_pair(db, baseline_id, student_id)
            for student_id in occupant_ids
        ):
            pending_rooms += 1
    return pending_rooms
