import enum
from datetime import datetime

from sqlalchemy import Enum, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.core.database import Base


class AllocationStatus(enum.StrEnum):
    ACTIVE = "active"
    VACATED = "vacated"


class StudentRoomAllocation(Base):
    __tablename__ = "student_room_allocations"
    __table_args__ = (UniqueConstraint("student_id", "session_id"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    # Selected from a dropdown of Admin-created rooms, not free text (the Kofa bridge).
    room_id: Mapped[int] = mapped_column(ForeignKey("rooms.id"), nullable=False, index=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("sessions.id"), nullable=False, index=True)
    allocated_at: Mapped[datetime] = mapped_column(server_default=func.now())
    status: Mapped[AllocationStatus] = mapped_column(
        Enum(
            AllocationStatus, values_callable=lambda enum_cls: [member.value for member in enum_cls]
        ),
        nullable=False,
        default=AllocationStatus.ACTIVE,
        server_default=AllocationStatus.ACTIVE.value,
    )
