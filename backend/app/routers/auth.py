from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_role
from app.core.security import (
    create_access_token,
    generate_temporary_password,
    hash_password,
    verify_password,
)
from app.models.user import User, UserRole
from app.schemas.auth import LoginRequest, LoginResponse, ResetPasswordResponse
from app.services import audit

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> LoginResponse:
    user = db.query(User).filter(User.email == payload.email).first()

    if (
        user is None
        or not user.is_active
        or not verify_password(payload.password, user.password_hash)
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password"
        )

    token = create_access_token(user_id=user.id, role=user.role.value)
    return LoginResponse(access_token=token, role=user.role, full_name=user.full_name)


@router.post("/reset-password/{user_id}", response_model=ResetPasswordResponse)
def reset_password(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role(UserRole.ADMIN)),
) -> ResetPasswordResponse:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    temporary_password = generate_temporary_password()
    user.password_hash = hash_password(temporary_password)
    audit.record(
        db,
        user_id=admin.id,
        action="RESET_PASSWORD",
        entity_type="user",
        entity_id=user.id,
        description=f"Password reset for {user.email} by {admin.email}",
    )
    db.commit()

    return ResetPasswordResponse(temporary_password=temporary_password)
