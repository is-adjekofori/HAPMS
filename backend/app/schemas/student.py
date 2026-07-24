from datetime import datetime

from pydantic import BaseModel, Field

from app.models.asset_type import SignOffGroup
from app.models.condition_report import ConditionReportStatus
from app.models.session import SessionStatus
from app.models.sign_off import SignOffStatus
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


class SignOffCreate(BaseModel):
    baseline_id: int
    sign_off_group: SignOffGroup
    status: SignOffStatus
    # Required when status is 'contested' (enforced in the service layer, not
    # the schema); doubles as the dispute note (§7.7).
    comment: str | None = None


class SignOffResponse(BaseModel):
    id: int
    baseline_id: int
    sign_off_group: SignOffGroup
    status: SignOffStatus
    comment: str | None
    signed_at: datetime


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
    # This student's own sign-off for each group, if any (§7.3/BR-4.14: corner
    # is always individual; shared is per-student too, though the room-level
    # shared_confirmed derived flag - surfaced elsewhere - only needs one).
    corner_sign_off: SignOffResponse | None
    shared_sign_off: SignOffResponse | None


class ConditionReportCreate(BaseModel):
    description: str = Field(min_length=1)
    asset_type_id: int | None = None


class ConditionReportResponse(BaseModel):
    id: int
    allocation_id: int
    asset_type_id: int | None
    asset_type_code: str | None
    description: str
    reported_at: datetime
    status: ConditionReportStatus


class HistoryAllocationResponse(BaseModel):
    """One past (or current) room allocation - read-only, per BR-4.6/BR-4.7:
    there is no endpoint that lets a Student edit or delete these."""

    id: int
    session_id: int
    session_name: str
    session_status: SessionStatus
    hall_name: str
    room_number: str
    corner_label: str | None
    allocated_at: datetime
    status: AllocationStatus
