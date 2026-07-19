from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_role
from app.models.asset_type import AssetType
from app.models.baseline_item import BaselineItem
from app.models.hall import Hall
from app.models.porter_room_assignment import PorterRoomAssignment
from app.models.room import Room
from app.models.room_inventory_baseline import RoomInventoryBaseline
from app.models.sign_off import SignOff
from app.models.user import User, UserRole
from app.schemas.porter import (
    AssetTypeOption,
    BaselineCreate,
    BaselineItemResponse,
    BaselineResponse,
    PorterRoomResponse,
)
from app.services import audit
from app.services.baselines import valid_asset_rules_for_room
from app.services.sessions import get_active_session

router = APIRouter(prefix="/porter", tags=["porter"])


def _assigned_room_or_403(db: Session, porter: User, room_id: int) -> Room:
    """A Porter may only touch rooms in their own porter_room_assignments
    (§7.6). 404 when the room doesn't exist, 403 when it's not theirs - never
    leaking which of the two it is beyond the status code."""
    room = db.get(Room, room_id)
    if room is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found")
    assigned = (
        db.query(PorterRoomAssignment)
        .filter(
            PorterRoomAssignment.porter_id == porter.id,
            PorterRoomAssignment.room_id == room_id,
        )
        .first()
    )
    if assigned is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This room is not assigned to you",
        )
    return room


def _baseline_item_response(item: BaselineItem, asset_type: AssetType) -> BaselineItemResponse:
    return BaselineItemResponse(
        id=item.id,
        asset_type_id=item.asset_type_id,
        code=asset_type.code,
        display_name=asset_type.display_name,
        sign_off_group=asset_type.sign_off_group,
        quantity=item.quantity,
        condition=item.condition,
        notes=item.notes,
    )


@router.get("/rooms", response_model=list[PorterRoomResponse])
def list_assigned_rooms(
    db: Session = Depends(get_db),
    porter: User = Depends(require_role(UserRole.PORTER)),
) -> list[PorterRoomResponse]:
    # BR-3.1 / §7.6: only rooms assigned to this Porter.
    rows = (
        db.query(Room, Hall)
        .join(PorterRoomAssignment, PorterRoomAssignment.room_id == Room.id)
        .join(Hall, Hall.id == Room.hall_id)
        .filter(PorterRoomAssignment.porter_id == porter.id)
        .order_by(Room.hall_id, Room.room_number)
        .all()
    )

    active_session = get_active_session(db)
    responses: list[PorterRoomResponse] = []
    for room, hall in rows:
        baseline = None
        if active_session is not None:
            baseline = (
                db.query(RoomInventoryBaseline)
                .filter(
                    RoomInventoryBaseline.room_id == room.id,
                    RoomInventoryBaseline.session_id == active_session.id,
                )
                .first()
            )
        shared_confirmed = False
        if baseline is not None:
            shared_confirmed = (
                db.query(SignOff)
                .filter(
                    SignOff.baseline_id == baseline.id,
                    SignOff.sign_off_group == "shared",
                )
                .first()
                is not None
            )
        responses.append(
            PorterRoomResponse(
                id=room.id,
                hall_id=room.hall_id,
                hall_name=hall.name,
                room_number=room.room_number,
                corner_label=room.corner_label,
                capacity=room.capacity,
                has_baseline=baseline is not None,
                baseline_id=baseline.id if baseline is not None else None,
                baseline_locked=baseline.locked if baseline is not None else False,
                shared_confirmed=shared_confirmed,
            )
        )
    return responses


@router.get("/rooms/{room_id}/asset-types", response_model=list[AssetTypeOption])
def room_asset_types(
    room_id: int,
    db: Session = Depends(get_db),
    porter: User = Depends(require_role(UserRole.PORTER)),
) -> list[AssetTypeOption]:
    # BR-2.4 / BR-3.3 / §7.1: category-filtered valid asset types + defaults.
    room = _assigned_room_or_403(db, porter, room_id)
    return [
        AssetTypeOption(
            asset_type_id=asset_type.id,
            code=asset_type.code,
            display_name=asset_type.display_name,
            sign_off_group=asset_type.sign_off_group,
            default_quantity=rule.default_quantity,
            notes=rule.notes,
        )
        for rule, asset_type in valid_asset_rules_for_room(db, room)
    ]


@router.post("/rooms/{room_id}/baseline", response_model=BaselineResponse)
def create_baseline(
    room_id: int,
    payload: BaselineCreate,
    db: Session = Depends(get_db),
    porter: User = Depends(require_role(UserRole.PORTER)),
) -> BaselineResponse:
    # BR-3.2: a Porter records a room's baseline for the active session.
    room = _assigned_room_or_403(db, porter, room_id)

    active_session = get_active_session(db)
    if active_session is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="There is no active session; ask the Administrator to start one first",
        )

    # Only asset types valid for this room's hall may appear (§7.1). Build the
    # lookup once and validate every submitted item against it.
    valid = {asset_type.id: asset_type for _, asset_type in valid_asset_rules_for_room(db, room)}
    seen: set[int] = set()
    for item in payload.items:
        if item.asset_type_id not in valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Asset type {item.asset_type_id} is not valid for this room's hall",
            )
        if item.asset_type_id in seen:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Asset type {item.asset_type_id} is listed more than once",
            )
        seen.add(item.asset_type_id)

    # §7.9 / BR-7.4: one open baseline per room per session. The UNIQUE
    # (room_id, session_id) constraint is the backstop; this pre-check turns
    # the common case into a friendly message instead of a raw DB error.
    existing = (
        db.query(RoomInventoryBaseline)
        .filter(
            RoomInventoryBaseline.room_id == room.id,
            RoomInventoryBaseline.session_id == active_session.id,
        )
        .first()
    )
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This room already has an open baseline for the current session",
        )

    baseline = RoomInventoryBaseline(
        room_id=room.id,
        session_id=active_session.id,
        created_by=porter.id,
    )
    db.add(baseline)
    try:
        db.flush()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This room already has an open baseline for the current session",
        ) from exc

    for item in payload.items:
        db.add(
            BaselineItem(
                baseline_id=baseline.id,
                asset_type_id=item.asset_type_id,
                quantity=item.quantity,
                condition=item.condition,
            )
        )
    db.flush()

    audit.record(
        db,
        user_id=porter.id,
        action="CREATE_BASELINE",
        entity_type="room_inventory_baseline",
        entity_id=baseline.id,
        description=(
            f"Recorded baseline for room {room.id} "
            f"({len(payload.items)} items) in session {active_session.id}"
        ),
    )
    db.commit()
    db.refresh(baseline)

    items = (
        db.query(BaselineItem, AssetType)
        .join(AssetType, AssetType.id == BaselineItem.asset_type_id)
        .filter(BaselineItem.baseline_id == baseline.id)
        .order_by(AssetType.id)
        .all()
    )
    return BaselineResponse(
        id=baseline.id,
        room_id=baseline.room_id,
        session_id=baseline.session_id,
        created_by=baseline.created_by,
        created_at=baseline.created_at,
        locked=baseline.locked,
        items=[_baseline_item_response(item, asset_type) for item, asset_type in items],
    )
