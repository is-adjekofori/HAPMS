from datetime import datetime

from pydantic import BaseModel

from app.models.student_room_allocation import AllocationStatus
from app.schemas.porter import BaselineItemResponse


class RoomOption(BaseModel):
    """A room for the onboarding dropdown (the Kofa bridge, §5.5) - the
    Student picks from Admin-created rooms rather than typing free text."""

    id: int
    hall_id: int
    hall_name: str
    room_number: str
    corner_label: str | None
    capacity: int


class AllocationCreate(BaseModel):
    room_id: int


class AllocationResponse(BaseModel):
    id: int
    student_id: int
    room_id: int
    session_id: int
    allocated_at: datetime
    status: AllocationStatus


class StudentRoomResponse(BaseModel):
    room_id: int
    hall_name: str
    room_number: str
    corner_label: str | None
    # False when the Porter has not yet recorded a baseline for this room in
    # the active session; corner/shared are then both empty.
    has_baseline: bool
    baseline_id: int | None
    corner: list[BaselineItemResponse]
    shared: list[BaselineItemResponse]
