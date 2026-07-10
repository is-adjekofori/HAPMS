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


# Occupancy per room, from BRD.md §6.1-6.4. capacity is informational only,
# not enforced against allocation count in the MVP (§12), so a room's
# capacity is always fully derived from its hall's hall_type - never entered
# by the Admin, hence it's absent from POST /admin/rooms's request body (§8.2).
HALL_CAPACITIES = {
    HallType.REGULAR: 8,
    HallType.TETFUND_DANJUMA: 4,
    HallType.HALL_6: 4,
    HallType.HALL_7: 2,
}


def room_capacity(hall_type: HallType) -> int:
    return HALL_CAPACITIES[hall_type]
