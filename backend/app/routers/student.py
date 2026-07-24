from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_role
from app.models.asset_type import AssetType, SignOffGroup
from app.models.baseline_item import BaselineItem
from app.models.condition_report import ConditionReport
from app.models.hall import Hall
from app.models.room import Room
from app.models.room_inventory_baseline import RoomInventoryBaseline
from app.models.session import HostelSession
from app.models.sign_off import SignOff, SignOffStatus
from app.models.student_room_allocation import AllocationStatus, StudentRoomAllocation
from app.models.user import User, UserRole
from app.schemas.porter import BaselineItemResponse
from app.schemas.student import (
    AllocationCreate,
    AllocationResponse,
    ConditionReportCreate,
    ConditionReportResponse,
    HistoryAllocationResponse,
    RoomOption,
    SignOffCreate,
    SignOffResponse,
    StudentRoomResponse,
)
from app.services import audit
from app.services.sessions import get_active_session

router = APIRouter(prefix="/student", tags=["student"])


@router.get("/rooms/available", response_model=list[RoomOption])
def list_available_rooms(
    db: Session = Depends(get_db),
    student: User = Depends(require_role(UserRole.STUDENT)),
) -> list[RoomOption]:
    # BR-1.5/BR-5.1: the Kofa bridge dropdown - every Admin-created room, not
    # filtered by occupancy (capacity is informational only, not enforced; §12).
    rows = (
        db.query(Room, Hall)
        .join(Hall, Hall.id == Room.hall_id)
        .order_by(Room.hall_id, Room.room_number)
        .all()
    )
    return [
        RoomOption(
            id=room.id,
            hall_id=room.hall_id,
            hall_name=hall.name,
            room_number=room.room_number,
            corner_label=room.corner_label,
            capacity=room.capacity,
        )
        for room, hall in rows
    ]


@router.post("/allocation", response_model=AllocationResponse)
def create_allocation(
    payload: AllocationCreate,
    db: Session = Depends(get_db),
    student: User = Depends(require_role(UserRole.STUDENT)),
) -> AllocationResponse:
    active_session = get_active_session(db)
    if active_session is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="There is no active session; ask the Administrator to start one first",
        )

    room = db.get(Room, payload.room_id)
    if room is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found")

    # UNIQUE(student_id, session_id): one allocation per Student per session.
    # There is no update-allocation endpoint in this phase - the Student
    # re-enters onboarding is out of scope, so a friendly pre-check plus the
    # UNIQUE backstop is enough.
    existing = (
        db.query(StudentRoomAllocation)
        .filter(
            StudentRoomAllocation.student_id == student.id,
            StudentRoomAllocation.session_id == active_session.id,
        )
        .first()
    )
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You already have a room allocation for the current session",
        )

    allocation = StudentRoomAllocation(
        student_id=student.id,
        room_id=room.id,
        session_id=active_session.id,
    )
    db.add(allocation)
    try:
        db.flush()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You already have a room allocation for the current session",
        ) from exc

    audit.record(
        db,
        user_id=student.id,
        action="CREATE_ALLOCATION",
        entity_type="student_room_allocation",
        entity_id=allocation.id,
        description=(
            f"Allocated to room {room.id} (hall {room.hall_id}) "
            f"for session {active_session.id} (Kofa bridge)"
        ),
    )
    db.commit()
    db.refresh(allocation)
    return AllocationResponse.model_validate(allocation, from_attributes=True)


def _student_baseline_or_403(db: Session, student: User, baseline_id: int) -> RoomInventoryBaseline:
    """A Student may only sign off on the baseline for their own currently
    allocated room in the active session (§7.3/BR-4.3). 404 when the baseline
    doesn't exist, 403 when it isn't theirs."""
    baseline = db.get(RoomInventoryBaseline, baseline_id)
    if baseline is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Baseline not found")

    active_session = get_active_session(db)
    if active_session is None or baseline.session_id != active_session.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This baseline is not available for sign-off",
        )

    allocation = (
        db.query(StudentRoomAllocation)
        .filter(
            StudentRoomAllocation.student_id == student.id,
            StudentRoomAllocation.session_id == active_session.id,
            StudentRoomAllocation.status == AllocationStatus.ACTIVE,
        )
        .first()
    )
    if allocation is None or allocation.room_id != baseline.room_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This baseline is not for your allocated room",
        )
    return baseline


@router.post("/signoff", response_model=SignOffResponse)
def create_signoff(
    payload: SignOffCreate,
    db: Session = Depends(get_db),
    student: User = Depends(require_role(UserRole.STUDENT)),
) -> SignOffResponse:
    # BR-4.3/BR-4.4/BR-4.8/BR-4.9: one independent sign-off per (baseline,
    # student, group) - corner and shared are always signed separately.
    baseline = _student_baseline_or_403(db, student, payload.baseline_id)

    if baseline.locked:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This room's baseline has been locked and can no longer be signed off",
        )

    comment = payload.comment.strip() if payload.comment else None
    if payload.status == SignOffStatus.CONTESTED and not comment:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A comment describing the issue is required to dispute this group",
        )

    existing = (
        db.query(SignOff)
        .filter(
            SignOff.baseline_id == baseline.id,
            SignOff.student_id == student.id,
            SignOff.sign_off_group == payload.sign_off_group,
        )
        .first()
    )
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already signed off on this group for this baseline",
        )

    signoff = SignOff(
        baseline_id=baseline.id,
        student_id=student.id,
        sign_off_group=payload.sign_off_group,
        status=payload.status,
        comment=comment,
    )
    db.add(signoff)
    try:
        db.flush()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already signed off on this group for this baseline",
        ) from exc

    audit.record(
        db,
        user_id=student.id,
        action="CREATE_SIGNOFF",
        entity_type="sign_off",
        entity_id=signoff.id,
        description=(
            f"{payload.status.value.capitalize()} sign-off ({payload.sign_off_group.value}) "
            f"for baseline {baseline.id}" + (f' — "{comment}"' if comment else "")
            # BR-4.10: dispute comments must surface in the Admin audit trail.
        ),
    )
    db.commit()
    db.refresh(signoff)
    return SignOffResponse.model_validate(signoff, from_attributes=True)


@router.get("/room", response_model=StudentRoomResponse)
def get_my_room(
    db: Session = Depends(get_db),
    student: User = Depends(require_role(UserRole.STUDENT)),
) -> StudentRoomResponse:
    active_session = get_active_session(db)
    allocation = None
    if active_session is not None:
        allocation = (
            db.query(StudentRoomAllocation)
            .filter(
                StudentRoomAllocation.student_id == student.id,
                StudentRoomAllocation.session_id == active_session.id,
                StudentRoomAllocation.status == AllocationStatus.ACTIVE,
            )
            .first()
        )
    if allocation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No room allocation found for the current session",
        )

    room = db.get(Room, allocation.room_id)
    hall = db.get(Hall, room.hall_id)

    baseline = (
        db.query(RoomInventoryBaseline)
        .filter(
            RoomInventoryBaseline.room_id == room.id,
            RoomInventoryBaseline.session_id == active_session.id,
        )
        .first()
    )

    corner: list[BaselineItemResponse] = []
    shared: list[BaselineItemResponse] = []
    if baseline is not None:
        rows = (
            db.query(BaselineItem, AssetType)
            .join(AssetType, AssetType.id == BaselineItem.asset_type_id)
            .filter(BaselineItem.baseline_id == baseline.id)
            .order_by(AssetType.id)
            .all()
        )
        # §7.3: split by sign_off_group, never merged, so the UI can render
        # "My Corner" and "Shared Room Items" as two independent groupings.
        for item, asset_type in rows:
            response_item = BaselineItemResponse(
                id=item.id,
                asset_type_id=item.asset_type_id,
                code=asset_type.code,
                display_name=asset_type.display_name,
                sign_off_group=asset_type.sign_off_group,
                quantity=item.quantity,
                condition=item.condition,
                notes=item.notes,
            )
            if asset_type.sign_off_group == SignOffGroup.CORNER:
                corner.append(response_item)
            else:
                shared.append(response_item)

    corner_sign_off = None
    shared_sign_off = None
    if baseline is not None:
        signoffs = (
            db.query(SignOff)
            .filter(SignOff.baseline_id == baseline.id, SignOff.student_id == student.id)
            .all()
        )
        for signoff in signoffs:
            response_signoff = SignOffResponse.model_validate(signoff, from_attributes=True)
            if signoff.sign_off_group == SignOffGroup.CORNER:
                corner_sign_off = response_signoff
            else:
                shared_sign_off = response_signoff

    return StudentRoomResponse(
        room_id=room.id,
        hall_name=hall.name,
        room_number=room.room_number,
        corner_label=room.corner_label,
        has_baseline=baseline is not None,
        baseline_id=baseline.id if baseline is not None else None,
        corner=corner,
        shared=shared,
        corner_sign_off=corner_sign_off,
        shared_sign_off=shared_sign_off,
    )


@router.post("/condition-report", response_model=ConditionReportResponse)
def create_condition_report(
    payload: ConditionReportCreate,
    db: Session = Depends(get_db),
    student: User = Depends(require_role(UserRole.STUDENT)),
) -> ConditionReportResponse:
    # BR-4.5: a Student may report a condition change "at any point before
    # vacating" - tied to their current (ACTIVE) allocation, not a specific
    # session lookup, and allowed even after the room's baseline is locked
    # (§7.5: condition reports are additive, never an edit).
    allocation = (
        db.query(StudentRoomAllocation)
        .filter(
            StudentRoomAllocation.student_id == student.id,
            StudentRoomAllocation.status == AllocationStatus.ACTIVE,
        )
        .first()
    )
    if allocation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You have no active room allocation to report against",
        )

    asset_type = None
    if payload.asset_type_id is not None:
        asset_type = db.get(AssetType, payload.asset_type_id)
        if asset_type is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Asset type not found"
            )

    report = ConditionReport(
        allocation_id=allocation.id,
        asset_type_id=payload.asset_type_id,
        description=payload.description.strip(),
    )
    db.add(report)
    db.flush()

    audit.record(
        db,
        user_id=student.id,
        action="CREATE_CONDITION_REPORT",
        entity_type="condition_report",
        entity_id=report.id,
        description=f"Condition report on allocation {allocation.id}: {report.description}",
    )
    db.commit()
    db.refresh(report)
    return ConditionReportResponse(
        id=report.id,
        allocation_id=report.allocation_id,
        asset_type_id=report.asset_type_id,
        asset_type_code=asset_type.code if asset_type is not None else None,
        description=report.description,
        reported_at=report.reported_at,
        status=report.status,
    )


@router.get("/history", response_model=list[HistoryAllocationResponse])
def get_history(
    db: Session = Depends(get_db),
    student: User = Depends(require_role(UserRole.STUDENT)),
) -> list[HistoryAllocationResponse]:
    # BR-4.6/BR-4.7: read-only, every past (and current) allocation for this
    # Student - no endpoint anywhere lets them edit or delete one.
    rows = (
        db.query(StudentRoomAllocation, Room, Hall, HostelSession)
        .join(Room, Room.id == StudentRoomAllocation.room_id)
        .join(Hall, Hall.id == Room.hall_id)
        .join(HostelSession, HostelSession.id == StudentRoomAllocation.session_id)
        .filter(StudentRoomAllocation.student_id == student.id)
        .order_by(StudentRoomAllocation.allocated_at.desc())
        .all()
    )
    return [
        HistoryAllocationResponse(
            id=allocation.id,
            session_id=session.id,
            session_name=session.name,
            session_status=session.status,
            hall_name=hall.name,
            room_number=room.room_number,
            corner_label=room.corner_label,
            allocated_at=allocation.allocated_at,
            status=allocation.status,
        )
        for allocation, room, hall, session in rows
    ]
