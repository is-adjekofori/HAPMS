"""T11.2 — session-lifecycle edge cases (§7.9).

Confirms duplicate-baseline rejection (409, friendly message) and the
session-close verification gate (409 + outstanding room list) behave exactly
as specified, against the real dev database.
"""

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


def test_duplicate_baseline_is_rejected_with_friendly_409(client, db):
    hall = make_hall(db, HallType.REGULAR)
    room = make_room(db, hall)
    porter = make_user(db, UserRole.PORTER, "porter")
    assignment = PorterRoomAssignment(porter_id=porter.id, room_id=room.id)
    db.add(assignment)
    db.commit()
    session = _make_active_session(db, f"t11-2-dup-{room.id}")

    baseline_id = None
    try:
        headers = auth_headers(porter)
        types_resp = client.get(f"/api/porter/rooms/{room.id}/asset-types", headers=headers)
        asset_type_id = types_resp.json()[0]["asset_type_id"]
        item_payload = {
            "items": [{"asset_type_id": asset_type_id, "quantity": 1, "condition": "good"}]
        }

        first = client.post(
            f"/api/porter/rooms/{room.id}/baseline", headers=headers, json=item_payload
        )
        assert first.status_code == 200
        baseline_id = first.json()["id"]

        second = client.post(
            f"/api/porter/rooms/{room.id}/baseline", headers=headers, json=item_payload
        )
        assert second.status_code == 409
        detail = second.json()["detail"]
        assert isinstance(detail, str) and "already" in detail.lower()
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


def test_session_close_blocked_by_unverified_room_and_unblocked_after_verify(client, db):
    hall = make_hall(db, HallType.REGULAR)
    room = make_room(db, hall)
    porter = make_user(db, UserRole.PORTER, "porter")
    admin = make_user(db, UserRole.ADMIN, "admin")
    assignment = PorterRoomAssignment(porter_id=porter.id, room_id=room.id)
    db.add(assignment)
    db.commit()
    session = _make_active_session(db, f"t11-2-close-{room.id}")

    baseline_id = None
    try:
        porter_headers = auth_headers(porter)
        admin_headers = auth_headers(admin)

        types_resp = client.get(f"/api/porter/rooms/{room.id}/asset-types", headers=porter_headers)
        asset_type_id = types_resp.json()[0]["asset_type_id"]
        create_resp = client.post(
            f"/api/porter/rooms/{room.id}/baseline",
            headers=porter_headers,
            json={"items": [{"asset_type_id": asset_type_id, "quantity": 1, "condition": "good"}]},
        )
        assert create_resp.status_code == 200
        baseline_id = create_resp.json()["id"]
        baseline_item_id = create_resp.json()["items"][0]["id"]

        # Baseline is recorded but not yet verified: closing the session must
        # be blocked with the specific unverified room listed.
        close_attempt = client.patch(
            f"/api/admin/sessions/{session.id}/close", headers=admin_headers
        )
        assert close_attempt.status_code == 409
        detail = close_attempt.json()["detail"]
        assert isinstance(detail, dict)
        assert room.id in detail["unverified_room_ids"]

        # Verify + lock the baseline, then closing must succeed.
        verify_resp = client.post(
            f"/api/porter/baselines/{baseline_id}/verify",
            headers=porter_headers,
            json={
                "items": [
                    {
                        "baseline_item_id": baseline_item_id,
                        "current_quantity": 1,
                        "current_condition": "good",
                    }
                ]
            },
        )
        assert verify_resp.status_code == 200

        close_ok = client.patch(f"/api/admin/sessions/{session.id}/close", headers=admin_headers)
        assert close_ok.status_code == 200
        assert close_ok.json()["status"] == "closed"

        # Closing an already-closed session is a clean 409, not a 500.
        close_again = client.patch(f"/api/admin/sessions/{session.id}/close", headers=admin_headers)
        assert close_again.status_code == 409
    finally:
        from app.models.audit_log import AuditLog
        from app.models.baseline_item import BaselineItem
        from app.models.room_inventory_baseline import RoomInventoryBaseline
        from app.models.session_end_verification import SessionEndVerification
        from app.models.verification_item import VerificationItem

        if baseline_id is not None:
            db.query(VerificationItem).filter(
                VerificationItem.baseline_item_id.in_(
                    db.query(BaselineItem.id).filter(BaselineItem.baseline_id == baseline_id)
                )
            ).delete(synchronize_session=False)
            db.query(SessionEndVerification).filter(
                SessionEndVerification.baseline_id == baseline_id
            ).delete()
            db.query(BaselineItem).filter(BaselineItem.baseline_id == baseline_id).delete()
            db.query(RoomInventoryBaseline).filter(RoomInventoryBaseline.id == baseline_id).delete()
        db.query(AuditLog).filter(AuditLog.user_id.in_([porter.id, admin.id])).delete(
            synchronize_session=False
        )
        db.commit()
        delete_all(db, assignment, session, porter, admin, room, hall)


def test_creating_a_second_active_session_is_rejected(client, db):
    admin = make_user(db, UserRole.ADMIN, "admin")
    session = _make_active_session(db, "t11-2-single-active")

    try:
        resp = client.post(
            "/api/admin/sessions",
            headers=auth_headers(admin),
            json={
                "name": "t11-2-second-attempt",
                "started_at": dt.datetime.now(dt.UTC).isoformat(),
            },
        )
        assert resp.status_code == 409
    finally:
        from app.models.audit_log import AuditLog

        db.query(AuditLog).filter(AuditLog.user_id == admin.id).delete()
        db.commit()
        delete_all(db, session, admin)
