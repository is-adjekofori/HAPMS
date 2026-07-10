from pydantic import BaseModel, EmailStr

from app.models.user import UserRole


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    access_token: str
    role: UserRole
    full_name: str


class ResetPasswordResponse(BaseModel):
    temporary_password: str
