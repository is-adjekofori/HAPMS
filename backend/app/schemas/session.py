from datetime import datetime

from pydantic import BaseModel, Field

from app.models.session import SessionStatus


class SessionCreate(BaseModel):
    # Matches sessions.name's VARCHAR(100) (§6.7) so an oversized value is a
    # clean 422 instead of a raw MySQL DataError under strict SQL mode.
    name: str = Field(min_length=1, max_length=100)
    started_at: datetime


class SessionResponse(BaseModel):
    id: int
    name: str
    status: SessionStatus
    started_at: datetime
    closed_at: datetime | None
