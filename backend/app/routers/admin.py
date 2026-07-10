from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_role
from app.models.hall import Hall
from app.models.room import Room
from app.models.user import User, UserRole
from app.schemas.hall import HallCreate, HallResponse
from app.schemas.room import RoomCreate, RoomResponse
from app.services import audit
from app.services.asset_rules import hall_category, room_capacity

router = APIRouter(prefix="/admin", tags=["admin"])


def _to_hall_response(hall: Hall) -> HallResponse:
    return HallResponse(
        id=hall.id,
        name=hall.name,
        hall_type=hall.hall_type,
        category=hall_category(hall.hall_type),
        created_at=hall.created_at,
    )


@router.post("/halls", response_model=HallResponse)
def create_hall(
    payload: HallCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role(UserRole.ADMIN)),
) -> HallResponse:
    hall = Hall(name=payload.name, hall_type=payload.hall_type)
    db.add(hall)
    try:
        db.flush()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="A hall with this name already exists"
        ) from exc

    audit.record(
        db,
        user_id=admin.id,
        action="CREATE_HALL",
        entity_type="hall",
        entity_id=hall.id,
        description=f"Created hall {hall.name} ({hall.hall_type.value})",
    )
    db.commit()
    db.refresh(hall)
    return _to_hall_response(hall)


@router.get("/halls", response_model=list[HallResponse])
def list_halls(
    db: Session = Depends(get_db),
    admin: User = Depends(require_role(UserRole.ADMIN)),
) -> list[HallResponse]:
    halls = db.query(Hall).order_by(Hall.name).all()
    return [_to_hall_response(hall) for hall in halls]


@router.post("/rooms", response_model=RoomResponse)
def create_room(
    payload: RoomCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role(UserRole.ADMIN)),
) -> RoomResponse:
    hall = db.get(Hall, payload.hall_id)
    if hall is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hall not found")

    # UNIQUE(hall_id, room_number, corner_label) alone doesn't catch duplicates
    # when corner_label is NULL: SQL treats NULL as distinct from NULL in unique
    # constraints, so it only protects Hall 7's corner-labelled rooms. Every
    # other hall (corner_label always NULL) needs this explicit pre-check.
    duplicate = (
        db.query(Room)
        .filter(
            Room.hall_id == payload.hall_id,
            Room.room_number == payload.room_number,
            Room.corner_label.is_(payload.corner_label)
            if payload.corner_label is None
            else Room.corner_label == payload.corner_label,
        )
        .first()
    )
    if duplicate is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A room with this number (and corner, if given) already exists in this hall",
        )

    room = Room(
        hall_id=hall.id,
        room_number=payload.room_number,
        corner_label=payload.corner_label,
        capacity=room_capacity(hall.hall_type),
    )
    db.add(room)
    try:
        db.flush()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A room with this number (and corner, if given) already exists in this hall",
        ) from exc

    audit.record(
        db,
        user_id=admin.id,
        action="CREATE_ROOM",
        entity_type="room",
        entity_id=room.id,
        description=f"Created room {hall.name} / {room.room_number} (capacity {room.capacity})",
    )
    db.commit()
    db.refresh(room)
    return RoomResponse.model_validate(room, from_attributes=True)


@router.get("/rooms", response_model=list[RoomResponse])
def list_rooms(
    db: Session = Depends(get_db),
    admin: User = Depends(require_role(UserRole.ADMIN)),
) -> list[RoomResponse]:
    rooms = db.query(Room).order_by(Room.hall_id, Room.room_number).all()
    return [RoomResponse.model_validate(room, from_attributes=True) for room in rooms]
