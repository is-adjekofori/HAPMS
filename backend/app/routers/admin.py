from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_role
from app.models.hall import Hall
from app.models.user import User, UserRole
from app.schemas.hall import HallCreate, HallResponse
from app.services import audit
from app.services.asset_rules import hall_category

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
