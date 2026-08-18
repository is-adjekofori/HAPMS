"""Run all seed scripts against the configured database.

Usage: uv run python -m app.seed.run
"""

from app.core.database import SessionLocal
from app.seed.asset_reference import seed_asset_reference
from app.seed.halls import seed_halls


def main() -> None:
    db = SessionLocal()
    try:
        seed_asset_reference(db)
        seed_halls(db)
    finally:
        db.close()


if __name__ == "__main__":
    main()
