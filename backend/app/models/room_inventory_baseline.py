from datetime import datetime

from sqlalchemy import Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.core.database import Base


class RoomInventoryBaseline(Base):
    __tablename__ = "room_inventory_baselines"
    __table_args__ = (UniqueConstraint("room_id", "session_id"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    room_id: Mapped[int] = mapped_column(ForeignKey("rooms.id"), nullable=False, index=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("sessions.id"), nullable=False, index=True)
    # Must be a Porter assigned to this room (enforced in the service layer, not the schema).
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    # Set TRUE once Session-End Verification is submitted (§7.5); once locked, the
    # API must reject further edits to baseline_items or sign_offs for this baseline.
    locked: Mapped[bool] = mapped_column(Boolean, default=False, server_default="0")
