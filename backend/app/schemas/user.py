from datetime import datetime

from pydantic import BaseModel, EmailStr

from app.models.user import UserRole


class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    # BR-2.5: the Admin creates Porter and Student accounts only. Admin
    # accounts are provisioned outside this endpoint (e.g. a seed script).
    role: UserRole


class UserCreateResponse(BaseModel):
    id: int
    full_name: str
    email: str
    role: UserRole
    is_active: bool
    created_at: datetime
    # Shown once so the Admin can relay it manually - no email delivery in
    # this phase (§5, §11), same pattern as POST /auth/reset-password/{id}.
    temporary_password: str


class UserResponse(BaseModel):
    id: int
    full_name: str
    email: str
    role: UserRole
    is_active: bool
    created_at: datetime
