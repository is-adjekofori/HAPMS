"""baseline item condition split

Revision ID: 8a2f1c9d4b3e
Revises: 5058c52a1040
Create Date: 2026-08-20 00:00:00.000000

"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "8a2f1c9d4b3e"
down_revision: str | Sequence[str] | None = "5058c52a1040"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    # Allow a room baseline to carry several rows per asset type - one per
    # condition bucket (e.g. 2 good bunk beds + 2 damaged), instead of a
    # single quantity+condition pair per asset type.
    op.drop_constraint("baseline_id", "baseline_items", type_="unique")
    op.create_unique_constraint(
        "uq_baseline_items_baseline_asset_condition",
        "baseline_items",
        ["baseline_id", "asset_type_id", "condition"],
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(
        "uq_baseline_items_baseline_asset_condition", "baseline_items", type_="unique"
    )
    op.create_unique_constraint("baseline_id", "baseline_items", ["baseline_id", "asset_type_id"])
