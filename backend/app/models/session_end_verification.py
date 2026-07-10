from datetime import datetime

from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.core.database import Base


class SessionEndVerification(Base):
    __tablename__ = "session_end_verifications"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    # 1:1 with room_inventory_baselines.
    baseline_id: Mapped[int] = mapped_column(
        ForeignKey("room_inventory_baselines.id"), unique=True, nullable=False
    )
    # Must be a Porter assigned to this room (enforced in the service layer, not
    # the schema).
    verified_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    verified_at: Mapped[datetime] = mapped_column(server_default=func.now())
