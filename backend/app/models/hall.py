import enum
from datetime import datetime

from sqlalchemy import Enum, String
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.core.database import Base


class HallType(enum.StrEnum):
    REGULAR = "regular"
    TETFUND_DANJUMA = "tetfund_danjuma"
    HALL_6 = "hall_6"
    HALL_7 = "hall_7"


class Hall(Base):
    __tablename__ = "halls"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    hall_type: Mapped[HallType] = mapped_column(
        Enum(HallType, values_callable=lambda enum_cls: [member.value for member in enum_cls]),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
