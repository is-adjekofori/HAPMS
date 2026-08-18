"""T11.5 — demo/UAT seed data.

Distinct from T1.2's structural seed (asset_types/hall_asset_rules, which
this script depends on and calls first): this populates a full, ready-to-tour
scenario — halls, rooms, real accounts, an active session, baselines, and
sign-offs — so the system can be demonstrated or UAT-tested without live data
entry. Deliberately covers every state the UI can show in one scenario:

- Room 101 (Regular): both occupants fully signed off, baseline verified
  clean - the "everything OK" happy path.
- Room 102 (Regular): one occupant has *contested* the Shared items with a
  dispute comment; the other occupant hasn't signed off at all yet, and the
  baseline is still open (unverified) - shows the pending-signoff and
  pending-verification indicators together.
- Room 601 (Hall 6): baseline verified with a deliberately-flagged
  discrepancy (a missing bunk bed) - shows up in the Admin's flagged-issue
  count and reports.
- Room 701 corner A (Hall 7): no baseline recorded yet - shows the Porter's
  "Not recorded" indicator.

Idempotent by convention, not by upsert: if the demo hall already exists,
this is a no-op (safe to re-run without creating duplicates), matching T1.2's
"safe to re-run" bar for a stateful scenario rather than a lookup table.

Usage: `uv run python -m app.seed.run_demo`
"""

import datetime as dt

from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.baseline_item import AssetCondition, BaselineItem
from app.models.hall import Hall
from app.models.porter_room_assignment import PorterRoomAssignment
from app.models.room import Room
from app.models.room_inventory_baseline import RoomInventoryBaseline
from app.models.session import HostelSession, SessionStatus
from app.models.session_end_verification import SessionEndVerification
from app.models.sign_off import SignOff, SignOffStatus
from app.models.student_room_allocation import StudentRoomAllocation
from app.models.user import User, UserRole
from app.models.verification_item import (
    VerificationCondition,
    VerificationFlag,
    VerificationItem,
)
from app.services import audit
from app.services.asset_rules import room_capacity
from app.services.baselines import valid_asset_rules_for_room
from app.services.verification import compute_flag

DEMO_MARKER_EMAIL = "demo-admin@example.com"
DEMO_PASSWORD = "DemoPass123!"


def _make_user(db: Session, full_name: str, email: str, role: UserRole) -> User:
    user = User(
        full_name=full_name,
        email=email,
        password_hash=hash_password(DEMO_PASSWORD),
        role=role,
    )
    db.add(user)
    db.flush()
    return user


def _record_baseline(
    db: Session, room: Room, session: HostelSession, porter: User
) -> RoomInventoryBaseline:
    baseline = RoomInventoryBaseline(
        room_id=room.id, session_id=session.id, created_by=porter.id
    )
    db.add(baseline)
    db.flush()
    for rule, asset_type in valid_asset_rules_for_room(db, room):
        db.add(
            BaselineItem(
                baseline_id=baseline.id,
                asset_type_id=asset_type.id,
                quantity=rule.default_quantity,
                condition=AssetCondition.GOOD,
            )
        )
    db.flush()
    audit.record(
        db,
        user_id=porter.id,
        action="CREATE_BASELINE",
        entity_type="room_inventory_baseline",
        entity_id=baseline.id,
        description=f"[Demo] Recorded baseline for room {room.room_number}",
    )
    return baseline


def seed_demo_data(db: Session) -> None:
    if db.query(User).filter(User.email == DEMO_MARKER_EMAIL).first() is not None:
        print("Demo data already present - skipping (safe to re-run).")
        return

    admin = _make_user(
        db, "Demo Administrator", "demo-admin@example.com", UserRole.ADMIN
    )
    porter_1 = _make_user(
        db, "Demo Porter One", "demo-porter1@example.com", UserRole.PORTER
    )
    porter_2 = _make_user(
        db, "Demo Porter Two", "demo-porter2@example.com", UserRole.PORTER
    )
    student_1 = _make_user(
        db, "Demo Student One", "demo-student1@example.com", UserRole.STUDENT
    )
    student_2 = _make_user(
        db, "Demo Student Two", "demo-student2@example.com", UserRole.STUDENT
    )
    student_3 = _make_user(
        db, "Demo Student Three", "demo-student3@example.com", UserRole.STUDENT
    )
    student_4 = _make_user(
        db, "Demo Student Four", "demo-student4@example.com", UserRole.STUDENT
    )

    # Halls are the fixed, real set seeded by app.seed.halls (run before this
    # in both app.seed.run_demo and the container entrypoint) - demo data
    # populates rooms in them rather than creating its own halls.
    hall_regular = db.query(Hall).filter(Hall.name == "Hall 1").one()
    hall_6 = db.query(Hall).filter(Hall.name == "Hall 6").one()
    hall_7 = db.query(Hall).filter(Hall.name == "Hall 7").one()

    room_101 = Room(
        hall_id=hall_regular.id,
        room_number="101",
        capacity=room_capacity(hall_regular.hall_type),
    )
    room_102 = Room(
        hall_id=hall_regular.id,
        room_number="102",
        capacity=room_capacity(hall_regular.hall_type),
    )
    room_601 = Room(
        hall_id=hall_6.id, room_number="601", capacity=room_capacity(hall_6.hall_type)
    )
    room_701a = Room(
        hall_id=hall_7.id,
        room_number="701",
        corner_label="A",
        capacity=room_capacity(hall_7.hall_type),
    )
    db.add_all([room_101, room_102, room_601, room_701a])
    db.flush()

    for room in (room_101, room_102, room_601):
        db.add(PorterRoomAssignment(porter_id=porter_1.id, room_id=room.id))
    db.add(PorterRoomAssignment(porter_id=porter_2.id, room_id=room_701a.id))
    db.flush()

    session = HostelSession(
        name="Demo Session",
        status=SessionStatus.ACTIVE,
        started_at=dt.datetime.now(dt.UTC),
    )
    db.add(session)
    db.flush()
    audit.record(
        db,
        user_id=admin.id,
        action="CREATE_SESSION",
        entity_type="session",
        entity_id=session.id,
        description="[Demo] Opened session",
    )

    for student, room in (
        (student_1, room_101),
        (student_2, room_102),
        (student_3, room_102),
        (student_4, room_601),
    ):
        allocation = StudentRoomAllocation(
            student_id=student.id, room_id=room.id, session_id=session.id
        )
        db.add(allocation)
        db.flush()
        audit.record(
            db,
            user_id=student.id,
            action="CREATE_ALLOCATION",
            entity_type="student_room_allocation",
            entity_id=allocation.id,
            description=f"[Demo] Allocated to room {room.room_number}",
        )

    # Room 101: clean baseline, both groups signed off, verified with no
    # flags - the "everything OK" happy path.
    baseline_101 = _record_baseline(db, room_101, session, porter_1)
    for group in ("corner", "shared"):
        signoff = SignOff(
            baseline_id=baseline_101.id,
            student_id=student_1.id,
            sign_off_group=group,
            status=SignOffStatus.CONFIRMED,
        )
        db.add(signoff)
        db.flush()
        audit.record(
            db,
            user_id=student_1.id,
            action="CREATE_SIGNOFF",
            entity_type="sign_off",
            entity_id=signoff.id,
            description=f"[Demo] Confirmed sign-off ({group}) for baseline {baseline_101.id}",
        )
    _verify_baseline(db, baseline_101, porter_1, discrepancy=False)

    # Room 102: one occupant disputes Shared items with a comment; the other
    # occupant hasn't signed off yet; baseline stays open (unverified).
    baseline_102 = _record_baseline(db, room_102, session, porter_1)
    corner_signoff = SignOff(
        baseline_id=baseline_102.id,
        student_id=student_2.id,
        sign_off_group="corner",
        status=SignOffStatus.CONFIRMED,
    )
    db.add(corner_signoff)
    db.flush()
    audit.record(
        db,
        user_id=student_2.id,
        action="CREATE_SIGNOFF",
        entity_type="sign_off",
        entity_id=corner_signoff.id,
        description=f"[Demo] Confirmed sign-off (corner) for baseline {baseline_102.id}",
    )
    dispute_comment = (
        "The overhead fan makes a loud rattling noise and one window blind is torn."
    )
    shared_signoff = SignOff(
        baseline_id=baseline_102.id,
        student_id=student_2.id,
        sign_off_group="shared",
        status=SignOffStatus.CONTESTED,
        comment=dispute_comment,
    )
    db.add(shared_signoff)
    db.flush()
    audit.record(
        db,
        user_id=student_2.id,
        action="CREATE_SIGNOFF",
        entity_type="sign_off",
        entity_id=shared_signoff.id,
        description=(
            f"[Demo] Contested sign-off (shared) for baseline {baseline_102.id} — "
            f'"{dispute_comment}"'
        ),
    )
    audit.record(
        db,
        user_id=student_2.id,
        action="CREATE_CONDITION_REPORT",
        entity_type="condition_report",
        entity_id=None,
        description="[Demo] Condition report: window blind in the shared area is torn",
    )

    # Room 601: verified with a deliberately-flagged discrepancy (a missing
    # bunk bed) so the Admin dashboard/reports show a nonzero flagged count.
    baseline_601 = _record_baseline(db, room_601, session, porter_1)
    signoff_601 = SignOff(
        baseline_id=baseline_601.id,
        student_id=student_4.id,
        sign_off_group="shared",
        status=SignOffStatus.CONFIRMED,
    )
    db.add(signoff_601)
    db.flush()
    audit.record(
        db,
        user_id=student_4.id,
        action="CREATE_SIGNOFF",
        entity_type="sign_off",
        entity_id=signoff_601.id,
        description=f"[Demo] Confirmed sign-off (shared) for baseline {baseline_601.id}",
    )
    _verify_baseline(db, baseline_601, porter_1, discrepancy=True)

    # Room 701 corner A: no baseline recorded yet - shows the Porter's
    # "Not recorded" indicator. Nothing further to do here.

    db.commit()
    print("Demo data seeded.")
    print(f"  Admin:    demo-admin@example.com / {DEMO_PASSWORD}")
    print(
        f"  Porter 1: demo-porter1@example.com / {DEMO_PASSWORD} (rooms 101, 102, 601)"
    )
    print(f"  Porter 2: demo-porter2@example.com / {DEMO_PASSWORD} (room 701 corner A)")
    print(f"  Students: demo-student1..4@example.com / {DEMO_PASSWORD}")


def _verify_baseline(
    db: Session, baseline: RoomInventoryBaseline, porter: User, *, discrepancy: bool
) -> None:
    items = db.query(BaselineItem).filter(BaselineItem.baseline_id == baseline.id).all()
    verification = SessionEndVerification(
        baseline_id=baseline.id, verified_by=porter.id
    )
    db.add(verification)
    db.flush()

    flagged_count = 0
    for index, item in enumerate(items):
        if discrepancy and index == 0:
            current_quantity, current_condition = (
                item.quantity,
                VerificationCondition.MISSING,
            )
        else:
            current_quantity = item.quantity
            current_condition = VerificationCondition(item.condition.value)
        flag = compute_flag(
            baseline_quantity=item.quantity,
            baseline_condition=item.condition,
            current_quantity=current_quantity,
            current_condition=current_condition,
        )
        if flag != VerificationFlag.OK:
            flagged_count += 1
        db.add(
            VerificationItem(
                verification_id=verification.id,
                baseline_item_id=item.id,
                current_quantity=current_quantity,
                current_condition=current_condition,
                flag=flag,
            )
        )
    baseline.locked = True
    db.flush()
    audit.record(
        db,
        user_id=porter.id,
        action="VERIFY_SESSION",
        entity_type="session_end_verification",
        entity_id=verification.id,
        description=(
            f"[Demo] Verified and locked baseline {baseline.id} "
            f"({flagged_count} flagged item(s) of {len(items)})"
        ),
    )
