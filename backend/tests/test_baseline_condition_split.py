"""Baseline items may split one asset type's quantity across several
condition buckets (e.g. 2 good bunk beds + 2 damaged), instead of forcing a
single quantity+condition pair for the whole asset type."""

import datetime as dt

from app.models.hall import HallType
from app.models.porter_room_assignment import PorterRoomAssignment
from app.models.session import HostelSession, SessionStatus
from app.models.user import UserRole
from tests.conftest import auth_headers, delete_all, make_hall, make_room, make_user


def _make_active_session(db, name: str) -> HostelSession:
    session = HostelSession(
        name=name, status=SessionStatus.ACTIVE, started_at=dt.datetime.now(dt.UTC)
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def test_baseline_accepts_split_conditions_for_one_asset_type(client, db):
    hall = make_hall(db, HallType.REGULAR)
    room = make_room(db, hall)
    porter = make_user(db, UserRole.PORTER, "porter")
    assignment = PorterRoomAssignment(porter_id=porter.id, room_id=room.id)
    db.add(assignment)
    db.commit()
    session = _make_active_session(db, f"t-split-{room.id}")

    baseline_id = None
    try:
        headers = auth_headers(porter)
        asset_type_id = client.get(
            f"/api/porter/rooms/{room.id}/asset-types", headers=headers
        ).json()[0]["asset_type_id"]

        resp = client.post(
            f"/api/porter/rooms/{room.id}/baseline",
            headers=headers,
            json={
                "items": [
                    {"asset_type_id": asset_type_id, "quantity": 2, "condition": "good"},
                    {"asset_type_id": asset_type_id, "quantity": 2, "condition": "damaged"},
                    {"asset_type_id": asset_type_id, "quantity": 0, "condition": "fair"},
                ]
            },
        )
        assert resp.status_code == 200
        body = resp.json()
        baseline_id = body["id"]

        # The zero-quantity "fair" bucket is dropped; the two nonzero buckets
        # persist as separate rows for the same asset type.
        items = body["items"]
        assert len(items) == 2
        by_condition = {item["condition"]: item["quantity"] for item in items}
        assert by_condition == {"good": 2, "damaged": 2}
        assert all(item["asset_type_id"] == asset_type_id for item in items)
    finally:
        from app.models.audit_log import AuditLog
        from app.models.baseline_item import BaselineItem
        from app.models.room_inventory_baseline import RoomInventoryBaseline

        if baseline_id is not None:
            db.query(BaselineItem).filter(BaselineItem.baseline_id == baseline_id).delete()
            db.query(RoomInventoryBaseline).filter(RoomInventoryBaseline.id == baseline_id).delete()
        db.query(AuditLog).filter(
            AuditLog.entity_type == "room_inventory_baseline", AuditLog.user_id == porter.id
        ).delete()
        db.commit()
        delete_all(db, assignment, session, porter, room, hall)


def test_baseline_rejects_duplicate_asset_type_condition_pair(client, db):
    hall = make_hall(db, HallType.REGULAR)
    room = make_room(db, hall)
    porter = make_user(db, UserRole.PORTER, "porter")
    assignment = PorterRoomAssignment(porter_id=porter.id, room_id=room.id)
    db.add(assignment)
    db.commit()
    session = _make_active_session(db, f"t-split-dup-{room.id}")

    try:
        headers = auth_headers(porter)
        asset_type_id = client.get(
            f"/api/porter/rooms/{room.id}/asset-types", headers=headers
        ).json()[0]["asset_type_id"]

        resp = client.post(
            f"/api/porter/rooms/{room.id}/baseline",
            headers=headers,
            json={
                "items": [
                    {"asset_type_id": asset_type_id, "quantity": 1, "condition": "good"},
                    {"asset_type_id": asset_type_id, "quantity": 1, "condition": "good"},
                ]
            },
        )
        assert resp.status_code == 400
        assert "more than once" in resp.json()["detail"].lower()
    finally:
        from app.models.audit_log import AuditLog

        db.query(AuditLog).filter(AuditLog.user_id == porter.id).delete()
        db.commit()
        delete_all(db, assignment, session, porter, room, hall)


def test_baseline_rejects_all_zero_quantities(client, db):
    hall = make_hall(db, HallType.REGULAR)
    room = make_room(db, hall)
    porter = make_user(db, UserRole.PORTER, "porter")
    assignment = PorterRoomAssignment(porter_id=porter.id, room_id=room.id)
    db.add(assignment)
    db.commit()
    session = _make_active_session(db, f"t-split-zero-{room.id}")

    try:
        headers = auth_headers(porter)
        asset_type_id = client.get(
            f"/api/porter/rooms/{room.id}/asset-types", headers=headers
        ).json()[0]["asset_type_id"]

        resp = client.post(
            f"/api/porter/rooms/{room.id}/baseline",
            headers=headers,
            json={"items": [{"asset_type_id": asset_type_id, "quantity": 0, "condition": "good"}]},
        )
        assert resp.status_code == 400
    finally:
        from app.models.audit_log import AuditLog

        db.query(AuditLog).filter(AuditLog.user_id == porter.id).delete()
        db.commit()
        delete_all(db, assignment, session, porter, room, hall)
