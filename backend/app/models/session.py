import enum
from datetime import datetime

from sqlalchemy import Enum, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class SessionStatus(enum.StrEnum):
    ACTIVE = "active"
    CLOSED = "closed"


# Named HostelSession (per BRD glossary: "Hostel Session"), not Session, to avoid
# colliding with sqlalchemy.orm.Session when both are imported in the same module.
class HostelSession(Base):
    __tablename__ = "sessions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    status: Mapped[SessionStatus] = mapped_column(
        Enum(SessionStatus, values_callable=lambda enum_cls: [member.value for member in enum_cls]),
        nullable=False,
        default=SessionStatus.ACTIVE,
        server_default=SessionStatus.ACTIVE.value,
    )
    started_at: Mapped[datetime] = mapped_column(nullable=False)
    closed_at: Mapped[datetime | None] = mapped_column()
