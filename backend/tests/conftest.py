"""Shared fixtures for integration tests (Phase 11 hardening).

These tests run against the real dev MySQL database (per project convention:
no mocking of the DB), using FastAPI's TestClient to drive the actual app. Each
test creates its own uniquely-named rows and deletes them itself in a
`finally` block, so the suite is safe to re-run without manual cleanup.
"""

import uuid
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient

from app.core.database import SessionLocal
from app.core.security import create_access_token, hash_password
from app.main import app
from app.models.hall import Hall, HallType
from app.models.room import Room
from app.models.user import User, UserRole


@pytest.fixture
def db() -> Generator:
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def unique(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:10]}"


def make_user(db, role: UserRole, prefix: str = "t11") -> User:
    user = User(
        full_name=f"Test {role.value.title()} {prefix}",
        email=f"{unique(prefix)}@example.com",
        password_hash=hash_password("Testpass123!"),
        role=role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def auth_headers(user: User) -> dict[str, str]:
    token = create_access_token(user_id=user.id, role=user.role.value)
    return {"Authorization": f"Bearer {token}"}


def make_hall(db, hall_type: HallType = HallType.REGULAR) -> Hall:
    hall = Hall(name=unique("hall"), hall_type=hall_type)
    db.add(hall)
    db.commit()
    db.refresh(hall)
    return hall


def delete_all(db, *objs) -> None:
    """Delete ORM objects in the given (child-first) order, flushing after
    each one. Plain models here have no `relationship()` links, so the ORM's
    automatic dependency-sort can't infer FK order across a single flush —
    callers must pass objects child-before-parent, and this flushes each
    DELETE individually so it actually executes in that order."""
    for obj in objs:
        if obj is not None:
            db.delete(obj)
            db.flush()
    db.commit()


def make_room(db, hall: Hall, capacity: int = 4, corner_label: str | None = None) -> Room:
    room = Room(
        hall_id=hall.id,
        room_number=unique("room")[:20],
        corner_label=corner_label,
        capacity=capacity,
    )
    db.add(room)
    db.commit()
    db.refresh(room)
    return room
