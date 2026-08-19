"""Seed the fixed set of real halls from BRD.md §1 (11 halls total: Halls
1-4 Regular; TETFUND Halls A-D, Daisy Danjuma Hostel, Hall 6, and Hall 7
Special). Idempotent: safe to re-run.

Hostel creation is intentionally not exposed through the API (POST
/admin/halls was removed) — the set of halls is fixed and managed here.
"""

from sqlalchemy.orm import Session

from app.models.hall import Hall, HallType

HALLS: list[dict] = [
    {"name": "Hall 1", "hall_type": HallType.REGULAR},
    {"name": "Hall 2", "hall_type": HallType.REGULAR},
    {"name": "Hall 3", "hall_type": HallType.REGULAR},
    {"name": "Hall 4", "hall_type": HallType.REGULAR},
    {"name": "TETFUND Hall A", "hall_type": HallType.TETFUND_DANJUMA},
    {"name": "TETFUND Hall B", "hall_type": HallType.TETFUND_DANJUMA},
    {"name": "TETFUND Hall C", "hall_type": HallType.TETFUND_DANJUMA},
    {"name": "TETFUND Hall D", "hall_type": HallType.TETFUND_DANJUMA},
    {"name": "Daisy Danjuma Hostel", "hall_type": HallType.TETFUND_DANJUMA},
    {"name": "Hall 6", "hall_type": HallType.HALL_6},
    {"name": "Hall 7", "hall_type": HallType.HALL_7},
]


def seed_halls(db: Session) -> None:
    existing_by_name = {hall.name: hall for hall in db.query(Hall).all()}

    for row in HALLS:
        hall = existing_by_name.get(row["name"])
        if hall is None:
            db.add(Hall(name=row["name"], hall_type=row["hall_type"]))
        else:
            hall.hall_type = row["hall_type"]

    db.commit()
