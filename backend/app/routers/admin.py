from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_role
from app.core.security import generate_temporary_password, hash_password
from app.models.audit_log import AuditLog
from app.models.hall import Hall
from app.models.porter_room_assignment import PorterRoomAssignment
from app.models.room import Room
from app.models.room_inventory_baseline import RoomInventoryBaseline
from app.models.session import HostelSession, SessionStatus
from app.models.session_end_verification import SessionEndVerification
from app.models.sign_off import SignOff
from app.models.user import User, UserRole
from app.models.verification_item import VerificationFlag, VerificationItem
from app.schemas.hall import HallCreate, HallResponse
from app.schemas.porter_assignment import PorterAssignmentCreate, PorterAssignmentResponse
from app.schemas.reports import (
    AuditLogEntry,
    BaselineReportItem,
    DashboardSummary,
    VerificationReportItem,
)
from app.schemas.room import RoomCreate, RoomResponse
from app.schemas.session import SessionCreate, SessionResponse
from app.schemas.user import UserCreate, UserCreateResponse, UserResponse
from app.services import audit
from app.services.asset_rules import hall_category, room_capacity
from app.services.pending import pending_signoff_room_count
from app.services.sessions import get_active_session

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


@router.post("/users", response_model=UserCreateResponse)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role(UserRole.ADMIN)),
) -> UserCreateResponse:
    # BR-1.3/BR-2.5: only Porter and Student accounts are created this way;
    # there is no public self-registration for any role, and Admin accounts
    # are provisioned outside this endpoint.
    if payload.role not in (UserRole.PORTER, UserRole.STUDENT):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only porter or student accounts can be created here",
        )

    temporary_password = generate_temporary_password()
    user = User(
        full_name=payload.full_name,
        email=payload.email,
        password_hash=hash_password(temporary_password),
        role=payload.role,
    )
    db.add(user)
    try:
        db.flush()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="A user with this email already exists"
        ) from exc

    audit.record(
        db,
        user_id=admin.id,
        action="CREATE_USER",
        entity_type="user",
        entity_id=user.id,
        description=f"Created {user.role.value} account for {user.email}",
    )
    db.commit()
    db.refresh(user)
    return UserCreateResponse(
        id=user.id,
        full_name=user.full_name,
        email=user.email,
        role=user.role,
        is_active=user.is_active,
        created_at=user.created_at,
        temporary_password=temporary_password,
    )


@router.get("/users", response_model=list[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    admin: User = Depends(require_role(UserRole.ADMIN)),
) -> list[UserResponse]:
    users = db.query(User).order_by(User.full_name).all()
    return [UserResponse.model_validate(user, from_attributes=True) for user in users]


@router.patch("/users/{user_id}/deactivate", response_model=UserResponse)
def deactivate_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role(UserRole.ADMIN)),
) -> UserResponse:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.is_active = False
    audit.record(
        db,
        user_id=admin.id,
        action="DEACTIVATE_USER",
        entity_type="user",
        entity_id=user.id,
        description=f"Deactivated account for {user.email}",
    )
    db.commit()
    db.refresh(user)
    return UserResponse.model_validate(user, from_attributes=True)


@router.post("/porter-assignments", response_model=PorterAssignmentResponse)
def create_porter_assignment(
    payload: PorterAssignmentCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role(UserRole.ADMIN)),
) -> PorterAssignmentResponse:
    porter = db.get(User, payload.porter_id)
    if porter is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Porter not found")
    if porter.role != UserRole.PORTER:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="porter_id must reference a user with the porter role",
        )

    room = db.get(Room, payload.room_id)
    if room is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found")

    assignment = PorterRoomAssignment(porter_id=porter.id, room_id=room.id)
    db.add(assignment)
    try:
        db.flush()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This porter is already assigned to this room",
        ) from exc

    audit.record(
        db,
        user_id=admin.id,
        action="CREATE_PORTER_ASSIGNMENT",
        entity_type="porter_room_assignment",
        entity_id=assignment.id,
        description=f"Assigned porter {porter.email} to room {room.id}",
    )
    db.commit()
    db.refresh(assignment)
    return PorterAssignmentResponse.model_validate(assignment, from_attributes=True)


@router.post("/sessions", response_model=SessionResponse)
def create_session(
    payload: SessionCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role(UserRole.ADMIN)),
) -> SessionResponse:
    # §6.7/§12: exactly one session is 'active' at a time, enforced here rather
    # than by auto-closing the existing one - the Admin must explicitly close it
    # first (PATCH .../close), so opening a new session never silently displaces
    # or hides an in-progress one.
    if get_active_session(db) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An active session already exists; close it before starting a new one",
        )

    session = HostelSession(name=payload.name, started_at=payload.started_at)
    db.add(session)
    try:
        db.flush()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="A session with this name already exists"
        ) from exc

    audit.record(
        db,
        user_id=admin.id,
        action="CREATE_SESSION",
        entity_type="session",
        entity_id=session.id,
        description=f"Created session {session.name}",
    )
    db.commit()
    db.refresh(session)
    return SessionResponse.model_validate(session, from_attributes=True)


@router.get("/sessions", response_model=list[SessionResponse])
def list_sessions(
    db: Session = Depends(get_db),
    admin: User = Depends(require_role(UserRole.ADMIN)),
) -> list[SessionResponse]:
    sessions = db.query(HostelSession).order_by(HostelSession.started_at.desc()).all()
    return [SessionResponse.model_validate(s, from_attributes=True) for s in sessions]


@router.patch("/sessions/{session_id}/close", response_model=SessionResponse)
def close_session(
    session_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role(UserRole.ADMIN)),
) -> SessionResponse:
    session = db.get(HostelSession, session_id)
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    if session.status == SessionStatus.CLOSED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Session is already closed"
        )

    unverified_room_ids = [
        room_id
        for (room_id,) in db.query(RoomInventoryBaseline.room_id)
        .filter(
            RoomInventoryBaseline.session_id == session_id,
            RoomInventoryBaseline.locked.is_(False),
        )
        .all()
    ]
    if unverified_room_ids:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "message": "Every room's baseline must be verified before closing this session",
                "unverified_room_ids": unverified_room_ids,
            },
        )

    session.status = SessionStatus.CLOSED
    session.closed_at = datetime.now(UTC)
    audit.record(
        db,
        user_id=admin.id,
        action="CLOSE_SESSION",
        entity_type="session",
        entity_id=session.id,
        description=f"Closed session {session.name}",
    )
    db.commit()
    db.refresh(session)
    return SessionResponse.model_validate(session, from_attributes=True)


@router.get("/dashboard/summary", response_model=DashboardSummary)
def dashboard_summary(
    db: Session = Depends(get_db),
    admin: User = Depends(require_role(UserRole.ADMIN)),
) -> DashboardSummary:
    # BR-2.1: "at a glance" totals - total rooms is unconditional, flagged
    # issues are scoped to the active session only (§7.4); 0 if none is active.
    total_rooms = db.query(Room).count()

    active_session = get_active_session(db)
    total_flagged_issues = 0
    pending_signoff_count = 0
    if active_session is not None:
        total_flagged_issues = (
            db.query(VerificationItem)
            .join(
                SessionEndVerification,
                SessionEndVerification.id == VerificationItem.verification_id,
            )
            .join(
                RoomInventoryBaseline,
                RoomInventoryBaseline.id == SessionEndVerification.baseline_id,
            )
            .filter(
                RoomInventoryBaseline.session_id == active_session.id,
                VerificationItem.flag != VerificationFlag.OK,
            )
            .count()
        )
        pending_signoff_count = pending_signoff_room_count(db, active_session)

    return DashboardSummary(
        total_rooms=total_rooms,
        total_flagged_issues=total_flagged_issues,
        pending_signoff_count=pending_signoff_count,
    )


@router.get("/reports/baselines", response_model=list[BaselineReportItem])
def baselines_report(
    db: Session = Depends(get_db),
    admin: User = Depends(require_role(UserRole.ADMIN)),
) -> list[BaselineReportItem]:
    # BR-2.7: a simple, unfiltered list across every session (§11 cut list -
    # filtering by hall/session/asset type was descoped for this MVP).
    rows = (
        db.query(RoomInventoryBaseline, Room, Hall, HostelSession, User)
        .join(Room, Room.id == RoomInventoryBaseline.room_id)
        .join(Hall, Hall.id == Room.hall_id)
        .join(HostelSession, HostelSession.id == RoomInventoryBaseline.session_id)
        .join(User, User.id == RoomInventoryBaseline.created_by)
        .order_by(RoomInventoryBaseline.created_at.desc())
        .all()
    )
    result: list[BaselineReportItem] = []
    for baseline, room, hall, session, creator in rows:
        shared_confirmed = (
            db.query(SignOff)
            .filter(SignOff.baseline_id == baseline.id, SignOff.sign_off_group == "shared")
            .first()
            is not None
        )
        result.append(
            BaselineReportItem(
                baseline_id=baseline.id,
                room_id=room.id,
                hall_name=hall.name,
                room_number=room.room_number,
                session_id=session.id,
                session_name=session.name,
                created_by=creator.id,
                created_by_name=creator.full_name,
                created_at=baseline.created_at,
                shared_confirmed=shared_confirmed,
            )
        )
    return result


@router.get("/reports/verifications", response_model=list[VerificationReportItem])
def verifications_report(
    db: Session = Depends(get_db),
    admin: User = Depends(require_role(UserRole.ADMIN)),
) -> list[VerificationReportItem]:
    rows = (
        db.query(SessionEndVerification, RoomInventoryBaseline, Room, Hall, HostelSession)
        .join(
            RoomInventoryBaseline,
            RoomInventoryBaseline.id == SessionEndVerification.baseline_id,
        )
        .join(Room, Room.id == RoomInventoryBaseline.room_id)
        .join(Hall, Hall.id == Room.hall_id)
        .join(HostelSession, HostelSession.id == RoomInventoryBaseline.session_id)
        .order_by(SessionEndVerification.verified_at.desc())
        .all()
    )
    result: list[VerificationReportItem] = []
    for verification, baseline, room, hall, session in rows:
        flagged_count = (
            db.query(VerificationItem)
            .filter(
                VerificationItem.verification_id == verification.id,
                VerificationItem.flag != VerificationFlag.OK,
            )
            .count()
        )
        result.append(
            VerificationReportItem(
                verification_id=verification.id,
                baseline_id=baseline.id,
                room_id=room.id,
                hall_name=hall.name,
                room_number=room.room_number,
                session_id=session.id,
                session_name=session.name,
                flagged_count=flagged_count,
                verified_at=verification.verified_at,
            )
        )
    return result


@router.get("/audit-log", response_model=list[AuditLogEntry])
def get_audit_log(
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    admin: User = Depends(require_role(UserRole.ADMIN)),
) -> list[AuditLogEntry]:
    # BR-2.9/BR-4.10: reverse-chronological, unfiltered, including sign-off
    # dispute comments (embedded in the description at write time - see
    # create_signoff in app/routers/student.py).
    rows = (
        db.query(AuditLog, User)
        .outerjoin(User, User.id == AuditLog.user_id)
        .order_by(AuditLog.created_at.desc(), AuditLog.id.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return [
        AuditLogEntry(
            id=log.id,
            user_id=log.user_id,
            user_name=user.full_name if user is not None else None,
            action=log.action,
            entity_type=log.entity_type,
            entity_id=log.entity_id,
            description=log.description,
            created_at=log.created_at,
        )
        for log, user in rows
    ]
