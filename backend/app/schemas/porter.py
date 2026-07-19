from datetime import datetime

from pydantic import BaseModel, Field

from app.models.asset_type import SignOffGroup
from app.models.baseline_item import AssetCondition


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
