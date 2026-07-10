from datetime import datetime

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.core.database import Base


class Room(Base):
    __tablename__ = "rooms"
    __table_args__ = (UniqueConstraint("hall_id", "room_number", "corner_label"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    hall_id: Mapped[int] = mapped_column(ForeignKey("halls.id"), nullable=False, index=True)
    room_number: Mapped[str] = mapped_column(String(20), nullable=False)
    # Optional wing/corner descriptor; used only for Hall 7 ("A"/"B") — meaning to be
    # confirmed with hostel administration (see TECHNICAL_MVP.md §12).
    corner_label: Mapped[str | None] = mapped_column(String(10))
    # Informational occupancy count derived from hall_type; not enforced (see §12).
    capacity: Mapped[int] = mapped_column(nullable=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
