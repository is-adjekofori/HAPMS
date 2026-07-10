import enum
from datetime import datetime

from sqlalchemy import Enum, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.core.database import Base


class ConditionReportStatus(enum.StrEnum):
    OPEN = "open"
    ACKNOWLEDGED = "acknowledged"


class ConditionReport(Base):
    __tablename__ = "condition_reports"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    allocation_id: Mapped[int] = mapped_column(
        ForeignKey("student_room_allocations.id"), nullable=False, index=True
    )
    # Optional — report may be general rather than tied to one asset type.
    asset_type_id: Mapped[int | None] = mapped_column(ForeignKey("asset_types.id"))
    description: Mapped[str] = mapped_column(Text, nullable=False)
    reported_at: Mapped[datetime] = mapped_column(server_default=func.now())
    status: Mapped[ConditionReportStatus] = mapped_column(
        Enum(
            ConditionReportStatus,
            values_callable=lambda enum_cls: [member.value for member in enum_cls],
        ),
        nullable=False,
        default=ConditionReportStatus.OPEN,
        server_default=ConditionReportStatus.OPEN.value,
    )
