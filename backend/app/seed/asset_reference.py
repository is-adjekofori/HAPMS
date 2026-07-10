"""Seed asset_types and hall_asset_rules with the fixed reference data from
TECHNICAL_MVP.md §9.1-9.2. Idempotent: safe to re-run.
"""

from sqlalchemy.orm import Session

from app.models.asset_type import AssetType, SignOffGroup
from app.models.hall import HallType
from app.models.hall_asset_rule import HallAssetRule

ASSET_TYPES: list[dict] = [
    {"code": "mattress", "display_name": "Mattress", "sign_off_group": SignOffGroup.CORNER},
    {"code": "table", "display_name": "Table", "sign_off_group": SignOffGroup.CORNER},
    {"code": "chair", "display_name": "Chair", "sign_off_group": SignOffGroup.CORNER},
    {"code": "bunk_bed", "display_name": "Bunk Bed", "sign_off_group": SignOffGroup.SHARED},
    {"code": "single_bed", "display_name": "Single Bed", "sign_off_group": SignOffGroup.SHARED},
    {"code": "fan", "display_name": "Fan", "sign_off_group": SignOffGroup.SHARED},
    {"code": "cupboard", "display_name": "Cupboard", "sign_off_group": SignOffGroup.SHARED},
    {
        "code": "window_blind",
        "display_name": "Window Blind",
        "sign_off_group": SignOffGroup.SHARED,
    },
]

HALL_ASSET_RULES: list[dict] = [
    {
        "hall_type": HallType.REGULAR,
        "asset_type": "bunk_bed",
        "default_quantity": 4,
        "notes": "Halls 1–4",
    },
    {"hall_type": HallType.REGULAR, "asset_type": "fan", "default_quantity": 1, "notes": None},
    {
        "hall_type": HallType.REGULAR,
        "asset_type": "cupboard",
        "default_quantity": 4,
        "notes": "shared 2 people to 1 cupboard",
    },
    {
        "hall_type": HallType.TETFUND_DANJUMA,
        "asset_type": "bunk_bed",
        "default_quantity": 2,
        "notes": "TETFUND A–D, Daisy Danjuma",
    },
    {
        "hall_type": HallType.TETFUND_DANJUMA,
        "asset_type": "mattress",
        "default_quantity": 4,
        "notes": None,
    },
    {
        "hall_type": HallType.TETFUND_DANJUMA,
        "asset_type": "table",
        "default_quantity": 1,
        "notes": "at least 1; Porter may increase",
    },
    {
        "hall_type": HallType.TETFUND_DANJUMA,
        "asset_type": "chair",
        "default_quantity": 1,
        "notes": "auto-matches table quantity",
    },
    {
        "hall_type": HallType.TETFUND_DANJUMA,
        "asset_type": "window_blind",
        "default_quantity": 1,
        "notes": None,
    },
    {
        "hall_type": HallType.TETFUND_DANJUMA,
        "asset_type": "cupboard",
        "default_quantity": 2,
        "notes": "PLACEHOLDER — count unconfirmed, see Section 12",
    },
    {"hall_type": HallType.HALL_6, "asset_type": "bunk_bed", "default_quantity": 2, "notes": None},
    {"hall_type": HallType.HALL_6, "asset_type": "mattress", "default_quantity": 4, "notes": None},
    {
        "hall_type": HallType.HALL_6,
        "asset_type": "table",
        "default_quantity": 4,
        "notes": "up to 4; Porter may reduce",
    },
    {
        "hall_type": HallType.HALL_6,
        "asset_type": "chair",
        "default_quantity": 4,
        "notes": "auto-matches table quantity",
    },
    {
        "hall_type": HallType.HALL_6,
        "asset_type": "window_blind",
        "default_quantity": 1,
        "notes": None,
    },
    {
        "hall_type": HallType.HALL_6,
        "asset_type": "cupboard",
        "default_quantity": 4,
        "notes": "1 per person",
    },
    {
        "hall_type": HallType.HALL_7,
        "asset_type": "single_bed",
        "default_quantity": 2,
        "notes": "no upper bunk",
    },
    {"hall_type": HallType.HALL_7, "asset_type": "mattress", "default_quantity": 2, "notes": None},
    {
        "hall_type": HallType.HALL_7,
        "asset_type": "table",
        "default_quantity": 1,
        "notes": "at least 1",
    },
    {
        "hall_type": HallType.HALL_7,
        "asset_type": "chair",
        "default_quantity": 1,
        "notes": "auto-matches table quantity",
    },
    {
        "hall_type": HallType.HALL_7,
        "asset_type": "window_blind",
        "default_quantity": 1,
        "notes": None,
    },
    {"hall_type": HallType.HALL_7, "asset_type": "cupboard", "default_quantity": 1, "notes": None},
]


def seed_asset_reference(db: Session) -> None:
    asset_types_by_code = {at.code: at for at in db.query(AssetType).all()}

    for row in ASSET_TYPES:
        existing = asset_types_by_code.get(row["code"])
        if existing is None:
            existing = AssetType(**row)
            db.add(existing)
            db.flush()
            asset_types_by_code[row["code"]] = existing
        else:
            existing.display_name = row["display_name"]
            existing.sign_off_group = row["sign_off_group"]

    existing_rules = {
        (rule.hall_type, rule.asset_type_id): rule for rule in db.query(HallAssetRule).all()
    }

    for row in HALL_ASSET_RULES:
        asset_type = asset_types_by_code[row["asset_type"]]
        key = (row["hall_type"], asset_type.id)
        rule = existing_rules.get(key)
        if rule is None:
            db.add(
                HallAssetRule(
                    hall_type=row["hall_type"],
                    asset_type_id=asset_type.id,
                    default_quantity=row["default_quantity"],
                    notes=row["notes"],
                )
            )
        else:
            rule.default_quantity = row["default_quantity"]
            rule.notes = row["notes"]

    db.commit()
