from datetime import datetime

from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.core.database import Base


class PorterRoomAssignment(Base):
    __tablename__ = "porter_room_assignments"
    __table_args__ = (UniqueConstraint("porter_id", "room_id"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    porter_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    room_id: Mapped[int] = mapped_column(ForeignKey("rooms.id"), nullable=False, index=True)
    assigned_at: Mapped[datetime] = mapped_column(server_default=func.now())
