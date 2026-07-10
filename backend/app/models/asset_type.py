import enum

from sqlalchemy import Enum, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class SignOffGroup(enum.StrEnum):
    CORNER = "corner"
    SHARED = "shared"


class AssetType(Base):
    __tablename__ = "asset_types"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    display_name: Mapped[str] = mapped_column(String(50), nullable=False)
    sign_off_group: Mapped[SignOffGroup] = mapped_column(
        Enum(SignOffGroup, values_callable=lambda enum_cls: [member.value for member in enum_cls]),
        nullable=False,
    )
