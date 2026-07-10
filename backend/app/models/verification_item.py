import enum

from sqlalchemy import Enum, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class VerificationCondition(enum.StrEnum):
    GOOD = "good"
    FAIR = "fair"
    DAMAGED = "damaged"
    MISSING = "missing"


class VerificationFlag(enum.StrEnum):
    OK = "ok"
    MISSING = "missing"
    DAMAGED = "damaged"
    QUANTITY_MISMATCH = "quantity_mismatch"


class VerificationItem(Base):
    __tablename__ = "verification_items"
    __table_args__ = (UniqueConstraint("verification_id", "baseline_item_id"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    verification_id: Mapped[int] = mapped_column(
        ForeignKey("session_end_verifications.id"), nullable=False, index=True
    )
    baseline_item_id: Mapped[int] = mapped_column(
        ForeignKey("baseline_items.id"), nullable=False, index=True
    )
    current_quantity: Mapped[int] = mapped_column(nullable=False)
    current_condition: Mapped[VerificationCondition] = mapped_column(
        Enum(
            VerificationCondition,
            values_callable=lambda enum_cls: [member.value for member in enum_cls],
        ),
        nullable=False,
    )
    # System-computed — see TECHNICAL_MVP.md §7.4 (auto-flagging algorithm).
    flag: Mapped[VerificationFlag] = mapped_column(
        Enum(
            VerificationFlag, values_callable=lambda enum_cls: [member.value for member in enum_cls]
        ),
        nullable=False,
        default=VerificationFlag.OK,
        server_default=VerificationFlag.OK.value,
    )
    notes: Mapped[str | None] = mapped_column(String(255))
