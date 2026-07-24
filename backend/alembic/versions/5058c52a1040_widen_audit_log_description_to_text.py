"""widen audit log description to text

Revision ID: 5058c52a1040
Revises: 3b27321444f8
Create Date: 2026-07-24 11:04:20.886900

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "5058c52a1040"
down_revision: str | Sequence[str] | None = "3b27321444f8"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.alter_column(
        "audit_logs",
        "description",
        existing_type=sa.String(length=255),
        type_=sa.Text(),
        existing_nullable=True,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.alter_column(
        "audit_logs",
        "description",
        existing_type=sa.Text(),
        type_=sa.String(length=255),
        existing_nullable=True,
    )
