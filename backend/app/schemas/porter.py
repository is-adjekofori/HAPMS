from datetime import datetime

from pydantic import BaseModel, Field

from app.models.asset_type import SignOffGroup
from app.models.baseline_item import AssetCondition
from app.models.sign_off import SignOffStatus
from app.models.verification_item import VerificationCondition, VerificationFlag


class AssetTypeOption(BaseModel):
    """A valid asset type for a room's hall, with its pre-filled default
    quantity (§7.1). The Porter may adjust quantity/condition but cannot add
    an asset type outside this list."""

    asset_type_id: int
    code: str
    display_name: str
    sign_off_group: SignOffGroup
    default_quantity: int
    notes: str | None


class PorterRoomResponse(BaseModel):
    id: int
    hall_id: int
    hall_name: str
    room_number: str
    corner_label: str | None
    capacity: int
    # Baseline status for the currently active session (§7.9). has_baseline is
    # False when no session is active or the room has no baseline yet.
    has_baseline: bool
    baseline_id: int | None
    baseline_locked: bool
    # §7.8: True as soon as any 'shared' sign-off row exists for the baseline.
    shared_confirmed: bool


class BaselineItemCreate(BaseModel):
    asset_type_id: int
    quantity: int = Field(ge=0)
    condition: AssetCondition = AssetCondition.GOOD


class BaselineCreate(BaseModel):
    items: list[BaselineItemCreate] = Field(min_length=1)


class BaselineItemResponse(BaseModel):
    id: int
    asset_type_id: int
    code: str
    display_name: str
    sign_off_group: SignOffGroup
    quantity: int
    condition: AssetCondition
    notes: str | None


class BaselineResponse(BaseModel):
    id: int
    room_id: int
    session_id: int
    created_by: int
    created_at: datetime
    locked: bool
    items: list[BaselineItemResponse]


class SignOffSummaryItem(BaseModel):
    """One student's sign-off for a group, surfaced to the Porter so dispute
    comments are visible to them too (BR-4.10) - a room can have several
    occupants, each with their own independent sign-off per group."""

    student_id: int
    student_name: str
    status: SignOffStatus
    comment: str | None
    signed_at: datetime


class BaselineDetailResponse(BaseModel):
    id: int
    room_id: int
    session_id: int
    created_by: int
    created_at: datetime
    locked: bool
    items: list[BaselineItemResponse]
    corner_sign_offs: list[SignOffSummaryItem]
    shared_sign_offs: list[SignOffSummaryItem]
    # §7.8: True as soon as any 'shared' sign-off exists, regardless of status.
    shared_confirmed: bool


class VerificationItemCreate(BaseModel):
    baseline_item_id: int
    current_quantity: int = Field(ge=0)
    current_condition: VerificationCondition


class VerificationCreate(BaseModel):
    items: list[VerificationItemCreate] = Field(min_length=1)


class VerificationItemResponse(BaseModel):
    baseline_item_id: int
    asset_type_id: int
    code: str
    display_name: str
    current_quantity: int
    current_condition: VerificationCondition
    flag: VerificationFlag


class VerificationResponse(BaseModel):
    verification_id: int
    baseline_id: int
    verified_at: datetime
    items: list[VerificationItemResponse]
