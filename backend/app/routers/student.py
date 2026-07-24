from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_role
from app.models.asset_type import AssetType, SignOffGroup
from app.models.baseline_item import BaselineItem
from app.models.hall import Hall
from app.models.room import Room
from app.models.room_inventory_baseline import RoomInventoryBaseline
from app.models.student_room_allocation import AllocationStatus, StudentRoomAllocation
from app.models.user import User, UserRole
from app.schemas.porter import BaselineItemResponse
from app.schemas.student import (
    AllocationCreate,
    AllocationResponse,
    RoomOption,
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

    return StudentRoomResponse(
        room_id=room.id,
        hall_name=hall.name,
        room_number=room.room_number,
        corner_label=room.corner_label,
        has_baseline=baseline is not None,
        baseline_id=baseline.id if baseline is not None else None,
        corner=corner,
        shared=shared,
    )
