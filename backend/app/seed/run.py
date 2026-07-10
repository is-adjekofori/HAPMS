"""Run all seed scripts against the configured database.

Usage: uv run python -m app.seed.run
"""

from app.core.database import SessionLocal
from app.seed.asset_reference import seed_asset_reference


def main() -> None:
    db = SessionLocal()
    try:
        seed_asset_reference(db)
    finally:
        db.close()


if __name__ == "__main__":
    main()
