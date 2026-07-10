import enum
from datetime import datetime

from sqlalchemy import Enum, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.core.database import Base
from app.models.asset_type import SignOffGroup


class SignOffStatus(enum.StrEnum):
    CONFIRMED = "confirmed"
    CONTESTED = "contested"


class SignOff(Base):
    __tablename__ = "sign_offs"
    __table_args__ = (UniqueConstraint("baseline_id", "student_id", "sign_off_group"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    baseline_id: Mapped[int] = mapped_column(
        ForeignKey("room_inventory_baselines.id"), nullable=False, index=True
    )
    student_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    sign_off_group: Mapped[SignOffGroup] = mapped_column(
        Enum(SignOffGroup, values_callable=lambda enum_cls: [member.value for member in enum_cls]),
        nullable=False,
    )
    status: Mapped[SignOffStatus] = mapped_column(
        Enum(SignOffStatus, values_callable=lambda enum_cls: [member.value for member in enum_cls]),
        nullable=False,
    )
    # Required if status = 'contested' (enforced in the service layer, not the
    # schema); doubles as the dispute note per §7.7 — a 'contested' sign-off with
    # a comment is still a valid, final sign-off, not a rejection.
    comment: Mapped[str | None] = mapped_column(String(500))
    signed_at: Mapped[datetime] = mapped_column(server_default=func.now())
