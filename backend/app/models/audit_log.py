from datetime import datetime

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.core.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    # e.g. CREATE_ROOM, CREATE_BASELINE, SIGN_OFF, VERIFY_SESSION
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    # e.g. "room_inventory_baseline"
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    entity_id: Mapped[int | None] = mapped_column()
    # TEXT, not VARCHAR(255): dispute sign-off comments (up to 500 chars, per
    # sign_offs.comment) are embedded here so the audit trail satisfies BR-4.10
    # without truncation.
    description: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), index=True)
