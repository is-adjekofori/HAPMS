"""Unit tests for the pure §7.4 auto-flagging decision logic - no database
needed, per T8.2."""

from app.models.baseline_item import AssetCondition
from app.models.verification_item import VerificationCondition, VerificationFlag
from app.services.verification import compute_flag


def test_missing_takes_priority_over_everything_else():
    # Even if quantity also looks fine, 'missing' wins.
    assert (
        compute_flag(2, AssetCondition.GOOD, 2, VerificationCondition.MISSING)
        == VerificationFlag.MISSING
    )


def test_newly_damaged_is_flagged():
    assert (
        compute_flag(1, AssetCondition.GOOD, 1, VerificationCondition.DAMAGED)
        == VerificationFlag.DAMAGED
    )


def test_already_damaged_at_baseline_is_not_re_flagged():
    # baseline_item.condition was already 'damaged' - not a new problem.
    assert (
        compute_flag(1, AssetCondition.DAMAGED, 1, VerificationCondition.DAMAGED)
        == VerificationFlag.OK
    )


def test_quantity_shortfall_is_flagged():
    assert (
        compute_flag(4, AssetCondition.GOOD, 3, VerificationCondition.GOOD)
        == VerificationFlag.QUANTITY_MISMATCH
    )


def test_quantity_increase_is_ok():
    # More than baseline is not a mismatch per §7.4 (only current < baseline).
    assert (
        compute_flag(4, AssetCondition.GOOD, 5, VerificationCondition.GOOD) == VerificationFlag.OK
    )


def test_matching_quantity_and_condition_is_ok():
    assert (
        compute_flag(2, AssetCondition.FAIR, 2, VerificationCondition.FAIR) == VerificationFlag.OK
    )


def test_damaged_condition_check_ignores_quantity_shortfall():
    # Per the exact §7.4 branch order, a newly-damaged item is flagged
    # 'damaged' even if its quantity also fell short - 'damaged' wins over
    # 'quantity_mismatch' since it's checked first.
    assert (
        compute_flag(4, AssetCondition.GOOD, 2, VerificationCondition.DAMAGED)
        == VerificationFlag.DAMAGED
    )
