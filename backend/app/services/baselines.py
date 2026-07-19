"""Porter baseline-entry domain logic (Phase 4): which asset types are valid
for a room, and creating a room's inventory baseline for the active session.
Kept out of the router so the validation rules live in one place."""

from sqlalchemy.orm import Session

from app.models.asset_type import AssetType
from app.models.hall import Hall
from app.models.hall_asset_rule import HallAssetRule
from app.models.room import Room


def valid_asset_rules_for_room(db: Session, room: Room) -> list[tuple[HallAssetRule, AssetType]]:
    """The hall_asset_rules valid for a room's hall_type, each paired with its
    AssetType, ordered by asset type id for a stable form layout (§7.1)."""
    hall = db.get(Hall, room.hall_id)
    if hall is None:  # pragma: no cover - a room always has a hall (FK)
        return []
    rows = (
        db.query(HallAssetRule, AssetType)
        .join(AssetType, HallAssetRule.asset_type_id == AssetType.id)
        .filter(HallAssetRule.hall_type == hall.hall_type)
        .order_by(AssetType.id)
        .all()
    )
    return list(rows)
