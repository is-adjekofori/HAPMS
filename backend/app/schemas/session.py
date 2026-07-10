from datetime import datetime

from pydantic import BaseModel

from app.models.session import SessionStatus


class SessionCreate(BaseModel):
    name: str
    started_at: datetime


class SessionResponse(BaseModel):
    id: int
    name: str
    status: SessionStatus
    started_at: datetime
    closed_at: datetime | None
