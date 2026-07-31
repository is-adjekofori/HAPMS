"""T11.1 — role-based data-scoping audit (BR-6.1).

Confirms the system-wide rule in BRD.md §7: a Student can never reach another
student's room, a Porter can never touch a room that isn't assigned to them,
and neither Porter nor Student can reach any /admin/* route.
"""

from app.models.porter_room_assignment import PorterRoomAssignment
from app.models.session import HostelSession, SessionStatus
from app.models.student_room_allocation import StudentRoomAllocation
from app.models.user import UserRole
from tests.conftest import auth_headers, delete_all, make_hall, make_room, make_user

ADMIN_ROUTES = [
    ("get", "/api/admin/halls"),
    ("get", "/api/admin/rooms"),
    ("get", "/api/admin/users"),
    ("get", "/api/admin/sessions"),
    ("get", "/api/admin/dashboard/summary"),
    ("get", "/api/admin/reports/baselines"),
    ("get", "/api/admin/reports/verifications"),
    ("get", "/api/admin/audit-log"),
]


def test_porter_cannot_reach_any_admin_route(client, db):
    porter = make_user(db, UserRole.PORTER, "porter")
    try:
        headers = auth_headers(porter)
        for method, path in ADMIN_ROUTES:
            resp = getattr(client, method)(path, headers=headers)
            assert resp.status_code == 403, f"{method.upper()} {path} was not 403 for a porter"
    finally:
        db.delete(porter)
        db.commit()


def test_student_cannot_reach_any_admin_route(client, db):
    student = make_user(db, UserRole.STUDENT, "student")
    try:
        headers = auth_headers(student)
        for method, path in ADMIN_ROUTES:
            resp = getattr(client, method)(path, headers=headers)
            assert resp.status_code == 403, f"{method.upper()} {path} was not 403 for a student"
    finally:
        db.delete(student)
        db.commit()


def test_unauthenticated_request_is_401_not_403():
    from fastapi.testclient import TestClient

    from app.main import app

    resp = TestClient(app).get("/api/admin/halls")
    assert resp.status_code == 401


def test_porter_cannot_fetch_or_act_on_an_unassigned_room(client, db):
    hall = make_hall(db)
    room_a = make_room(db, hall)  # assigned to porter_a
    room_b = make_room(db, hall)  # NOT assigned to porter_a
    porter_a = make_user(db, UserRole.PORTER, "porter_a")
    assignment = PorterRoomAssignment(porter_id=porter_a.id, room_id=room_a.id)
    db.add(assignment)
    db.commit()
    db.refresh(assignment)

    try:
        headers = auth_headers(porter_a)

        # room_a is theirs: asset-types listing should succeed.
        ok = client.get(f"/api/porter/rooms/{room_a.id}/asset-types", headers=headers)
        assert ok.status_code == 200

        # room_b is not assigned to this porter: every action on it is 403.
        resp = client.get(f"/api/porter/rooms/{room_b.id}/asset-types", headers=headers)
        assert resp.status_code == 403

        # A schema-valid (but not necessarily room-valid) body, so the request
        # clears Pydantic validation and actually reaches the room-ownership
        # check rather than failing 422 first.
        resp = client.post(
            f"/api/porter/rooms/{room_b.id}/baseline",
            headers=headers,
            json={"items": [{"asset_type_id": 1, "quantity": 1, "condition": "good"}]},
        )
        assert resp.status_code == 403

        # A baseline_id that exists at all (none does yet here) would 404;
        # confirm a nonexistent baseline id on the unowned room path is a
        # clean 404, not a 500 or a leak of room_b's existence via 403.
        resp = client.get("/api/porter/baselines/999999999", headers=headers)
        assert resp.status_code == 404
    finally:
        delete_all(db, assignment, porter_a, room_a, room_b, hall)


def test_porter_cannot_view_or_verify_another_porters_baseline(client, db):
    hall = make_hall(db)
    room = make_room(db, hall)
    porter_owner = make_user(db, UserRole.PORTER, "owner")
    porter_other = make_user(db, UserRole.PORTER, "other")
    assignment = PorterRoomAssignment(porter_id=porter_owner.id, room_id=room.id)
    db.add(assignment)
    db.commit()

    import datetime as dt

    session = HostelSession(
        name=f"t11-session-{room.id}",
        status=SessionStatus.ACTIVE,
        started_at=dt.datetime.now(dt.UTC),
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    from app.models.room_inventory_baseline import RoomInventoryBaseline

    baseline_id: int | None = None
    try:
        owner_headers = auth_headers(porter_owner)
        types_resp = client.get(f"/api/porter/rooms/{room.id}/asset-types", headers=owner_headers)
        asset_type_id = types_resp.json()[0]["asset_type_id"]
        create_resp = client.post(
            f"/api/porter/rooms/{room.id}/baseline",
            headers=owner_headers,
            json={"items": [{"asset_type_id": asset_type_id, "quantity": 1, "condition": "good"}]},
        )
        assert create_resp.status_code == 200
        baseline_id = create_resp.json()["id"]

        other_headers = auth_headers(porter_other)
        resp = client.get(f"/api/porter/baselines/{baseline_id}", headers=other_headers)
        assert resp.status_code == 403

        resp = client.post(
            f"/api/porter/baselines/{baseline_id}/verify",
            headers=other_headers,
            json={
                "items": [
                    {
                        "baseline_item_id": 1,
                        "current_quantity": 1,
                        "current_condition": "good",
                    }
                ]
            },
        )
        assert resp.status_code == 403
    finally:
        from app.models.audit_log import AuditLog
        from app.models.baseline_item import BaselineItem

        if baseline_id is not None:
            db.query(BaselineItem).filter(BaselineItem.baseline_id == baseline_id).delete()
            db.query(RoomInventoryBaseline).filter(RoomInventoryBaseline.id == baseline_id).delete()
        db.query(AuditLog).filter(AuditLog.entity_type == "room_inventory_baseline").filter(
            AuditLog.user_id == porter_owner.id
        ).delete()
        db.commit()
        delete_all(db, assignment, session, porter_owner, porter_other, room, hall)


def test_student_only_ever_sees_their_own_room(client, db):
    hall = make_hall(db)
    room_1 = make_room(db, hall)
    room_2 = make_room(db, hall)
    student_1 = make_user(db, UserRole.STUDENT, "s1")
    student_2 = make_user(db, UserRole.STUDENT, "s2")

    import datetime as dt

    session = HostelSession(
        name=f"t11-rbac-{room_1.id}",
        status=SessionStatus.ACTIVE,
        started_at=dt.datetime.now(dt.UTC),
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    alloc_1 = StudentRoomAllocation(
        student_id=student_1.id, room_id=room_1.id, session_id=session.id
    )
    alloc_2 = StudentRoomAllocation(
        student_id=student_2.id, room_id=room_2.id, session_id=session.id
    )
    db.add_all([alloc_1, alloc_2])
    db.commit()

    try:
        resp_1 = client.get("/api/student/room", headers=auth_headers(student_1))
        resp_2 = client.get("/api/student/room", headers=auth_headers(student_2))
        assert resp_1.status_code == 200
        assert resp_2.status_code == 200
        assert resp_1.json()["room_id"] == room_1.id
        assert resp_2.json()["room_id"] == room_2.id
        assert resp_1.json()["room_id"] != resp_2.json()["room_id"]

        # There is no endpoint that takes another student's id or allocation
        # id, so student_1 has no path at all to student_2's data by
        # construction — confirmed structurally, not just by this response.
    finally:
        delete_all(db, alloc_1, alloc_2, session, student_1, student_2, room_1, room_2, hall)
