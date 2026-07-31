"""Run the T1.2 structural seed and the T11.5 demo/UAT scenario together.

Usage: uv run python -m app.seed.run_demo
"""

from app.core.database import SessionLocal
from app.seed.asset_reference import seed_asset_reference
from app.seed.demo_data import seed_demo_data


def main() -> None:
    db = SessionLocal()
    try:
        seed_asset_reference(db)
        seed_demo_data(db)
    finally:
        db.close()


if __name__ == "__main__":
    main()
