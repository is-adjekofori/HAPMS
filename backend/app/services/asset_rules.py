from app.models.hall import HallType

HALL_CATEGORIES = {
    HallType.REGULAR: "Regular",
    HallType.TETFUND_DANJUMA: "Special",
    HallType.HALL_6: "Special",
    HallType.HALL_7: "Special",
}


def hall_category(hall_type: HallType) -> str:
    """Room category (Regular/Special) is derived from hall_type, not stored
    (TECHNICAL_MVP.md §12); this is the single place that mapping lives."""
    return HALL_CATEGORIES[hall_type]
