from datetime import datetime

from pydantic import BaseModel


class RoomCreate(BaseModel):
    hall_id: int
    room_number: str
    corner_label: str | None = None


class RoomResponse(BaseModel):
    id: int
    hall_id: int
    room_number: str
    corner_label: str | None
    capacity: int
    created_at: datetime
