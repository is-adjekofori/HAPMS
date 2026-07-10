from sqlalchemy import Enum, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.hall import HallType


class HallAssetRule(Base):
    __tablename__ = "hall_asset_rules"
    __table_args__ = (UniqueConstraint("hall_type", "asset_type_id"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    hall_type: Mapped[HallType] = mapped_column(
        Enum(HallType, values_callable=lambda enum_cls: [member.value for member in enum_cls]),
        nullable=False,
    )
    asset_type_id: Mapped[int] = mapped_column(
        ForeignKey("asset_types.id"), nullable=False, index=True
    )
    default_quantity: Mapped[int] = mapped_column(nullable=False)
    # e.g. "shared 2 people to 1 cupboard", "count pending confirmation"
    notes: Mapped[str | None] = mapped_column(String(255))
