from datetime import datetime

from pydantic import BaseModel, Field


class RoomCreate(BaseModel):
    hall_id: int
    # Matches rooms.room_number's VARCHAR(20) / corner_label's VARCHAR(10)
    # (§6.3) so an oversized value is a clean 422, not a raw MySQL DataError
    # under strict SQL mode.
    room_number: str = Field(min_length=1, max_length=20)
    corner_label: str | None = Field(default=None, max_length=10)


class RoomResponse(BaseModel):
    id: int
    hall_id: int
    room_number: str
    corner_label: str | None
    capacity: int
    created_at: datetime
