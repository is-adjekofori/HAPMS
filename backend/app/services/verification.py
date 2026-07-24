"""Session-End Verification auto-flagging (Phase 8): the exact decision logic
from TECHNICAL_MVP.md §7.4, kept as a pure function so it's unit-testable
without a database."""

from app.models.baseline_item import AssetCondition
from app.models.verification_item import VerificationCondition, VerificationFlag


def compute_flag(
    baseline_quantity: int,
    baseline_condition: AssetCondition,
    current_quantity: int,
    current_condition: VerificationCondition,
) -> VerificationFlag:
    if current_condition == VerificationCondition.MISSING:
        return VerificationFlag.MISSING
    if (
        current_condition == VerificationCondition.DAMAGED
        and baseline_condition != AssetCondition.DAMAGED
    ):
        return VerificationFlag.DAMAGED
    if current_quantity < baseline_quantity:
        return VerificationFlag.QUANTITY_MISMATCH
    return VerificationFlag.OK
