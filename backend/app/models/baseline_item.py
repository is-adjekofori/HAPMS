import enum

from sqlalchemy import Enum, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class AssetCondition(enum.StrEnum):
    GOOD = "good"
    FAIR = "fair"
    DAMAGED = "damaged"


class BaselineItem(Base):
    __tablename__ = "baseline_items"
    # A room can hold several units of one asset type split across
    # conditions (e.g. 2 good bunk beds + 2 damaged) - one row per
    # (asset_type, condition) bucket rather than one row per asset type.
    __table_args__ = (UniqueConstraint("baseline_id", "asset_type_id", "condition"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    baseline_id: Mapped[int] = mapped_column(
        ForeignKey("room_inventory_baselines.id"), nullable=False, index=True
    )
    # Must be valid for the room's hall_type (enforced in the service layer via
    # hall_asset_rules, not the schema).
    asset_type_id: Mapped[int] = mapped_column(ForeignKey("asset_types.id"), nullable=False)
    quantity: Mapped[int] = mapped_column(nullable=False)
    condition: Mapped[AssetCondition] = mapped_column(
        Enum(
            AssetCondition, values_callable=lambda enum_cls: [member.value for member in enum_cls]
        ),
        nullable=False,
        default=AssetCondition.GOOD,
        server_default=AssetCondition.GOOD.value,
    )
    notes: Mapped[str | None] = mapped_column(String(255))
