# Manual Test Workflow

A step-by-step walkthrough for manually testing HAPMS's functionality across all three roles, using
the demo/UAT seed data (`app.seed.run_demo`) so every state — clean, disputed, flagged, unrecorded —
is available at once without live data entry. See `docs/TASKS.md`'s T11.4 notes for the automated
equivalent of this same checklist (24/24 passing) and `docs/BRD.md §10` / `docs/TECHNICAL_MVP.md §13`
for the acceptance criteria this is derived from.

## 0. Setup

```bash
# Terminal 1 — database
cd HAPMS
podman compose up -d   # or: docker compose up -d

# Terminal 2 — backend
cd backend
uv run alembic upgrade head
uv run python -m app.seed.run          # structural reference data
uv run python -m app.seed.run_demo     # demo scenario + accounts
uv run uvicorn app.main:app --reload

# Terminal 3 — frontend
cd frontend
npm run dev
```

Open `http://localhost:3000`. All demo accounts use password `DemoPass123!`. Both seed scripts are
idempotent — safe to re-run.

## 1. Admin workflow (`demo-admin@example.com`)

1. Log in → land on **Dashboard**. Confirm you see: `total_rooms: 4`, `total_flagged_issues: 1`,
   `pending_signoff_count: 2`.
2. **Halls** page → confirm 3 halls listed (Regular, Hall 6, Hall 7) with correct categories. Create a
   new hall, confirm it appears.
3. **Rooms** page → confirm 4 rooms with correct capacities (8, 8, 4, 2). Create a room in your new
   hall.
4. **Users** page → create a Porter and a Student; note the one-time temp password shown. Deactivate a
   user, confirm status flips.
5. **Porter Assignments** → assign your new porter to your new room.
6. **Sessions** → try creating a second session (should 409, since "Demo Session" is active). Don't
   close it yet — you'll need it active for the porter/student steps below.
7. **Reports** → confirm Baselines and Verifications tables list the 3 recorded baselines.
8. **Audit Log** → confirm entries exist and that the dispute comment ("overhead fan makes a loud
   rattling noise...") is visible in the feed text.

## 2. Porter workflow

**Porter 1** (`demo-porter1@example.com`, rooms 101/102/601):

1. Log in → dashboard shows 3 rooms with statuses: 101 = Locked, 102 = Pending verification,
   601 = Locked.
2. Open room 102 → **Verify & lock**. Fill in current quantity/condition for each item (try
   deliberately marking one item "missing" or reducing a quantity) → submit → confirm the flag renders
   correctly (color-coded).
3. Revisit room 101 (already locked) → confirm it shows a locked state, not the entry form.

**Porter 2** (`demo-porter2@example.com`, room 701 corner A):

4. Log in → dashboard shows room 701 as "Not recorded".
5. Click **Record baseline** → fill in the form (note the table→chair auto-match behavior) → submit →
   confirm it now shows as recorded/pending verification.

## 3. Student workflow

**Student 1** (`demo-student1@example.com`, room 101, fully signed off):

1. Log in → My Room shows corner + shared items, both already signed off, no pending banner.
2. Check the **history** page → shows the room 101 allocation.

**Student 2** (`demo-student2@example.com`, room 102, disputed):

3. Log in → My Room shows the contested shared sign-off with your comment visible and read-only
   (can't re-submit).
4. Submit a **condition report** (with and without linking to an asset type) → confirm success
   message.

**Student 3** (`demo-student3@example.com`, room 102, no sign-off yet):

5. Log in → confirm the amber **pending** banner is shown.
6. Sign off corner as "confirmed", then shared as **contested** with a required dispute comment (try
   submitting with an empty comment first — should be blocked client-side and 400 server-side if
   bypassed).
7. Reload → confirm sign-off panel is now read-only and pending banner is gone.

**Student 4** (`demo-student4@example.com`, room 601):

8. Log in → sign off the remaining group they haven't done (this room was seeded with only a shared
   sign-off, so corner is still pending) → confirm the admin dashboard's `pending_signoff_count` drops
   after this.

## 4. Cross-role edge cases (worth spot-checking)

- Log in as a Porter and manually hit `/admin/halls` in the browser → should be blocked/redirected
  (403 under the hood).
- As Student 1, try to guess another student's room via the URL — there's no such route; confirm My
  Room only ever shows your own allocation.
- As Admin, try closing "Demo Session" while any room is still unverified → should 409 and list the
  unverified room id(s); verify the remaining rooms, then close should succeed.

## 5. Automated coverage (optional, faster)

```bash
cd backend
uv run pytest -v
```

Runs the RBAC-scoping, session-lifecycle, and flag-logic test suites (16 tests) against the same live
DB.

## Cleanup

The demo data leaves a permanently-active session, which will collide with anything else that assumes
it's the sole active session (including `pytest`). To remove it once you're done testing:

```bash
cd backend
uv run python -c "
from app.core.database import SessionLocal
from sqlalchemy import text
db = SessionLocal()
stmts = [
    \"DELETE FROM verification_items WHERE verification_id IN (SELECT id FROM session_end_verifications WHERE baseline_id IN (SELECT id FROM room_inventory_baselines WHERE room_id IN (SELECT id FROM rooms WHERE hall_id IN (SELECT id FROM halls WHERE name LIKE 'Demo Hall%'))))\",
    \"DELETE FROM session_end_verifications WHERE baseline_id IN (SELECT id FROM room_inventory_baselines WHERE room_id IN (SELECT id FROM rooms WHERE hall_id IN (SELECT id FROM halls WHERE name LIKE 'Demo Hall%')))\",
    \"DELETE FROM sign_offs WHERE baseline_id IN (SELECT id FROM room_inventory_baselines WHERE room_id IN (SELECT id FROM rooms WHERE hall_id IN (SELECT id FROM halls WHERE name LIKE 'Demo Hall%')))\",
    \"DELETE FROM baseline_items WHERE baseline_id IN (SELECT id FROM room_inventory_baselines WHERE room_id IN (SELECT id FROM rooms WHERE hall_id IN (SELECT id FROM halls WHERE name LIKE 'Demo Hall%')))\",
    \"DELETE FROM room_inventory_baselines WHERE room_id IN (SELECT id FROM rooms WHERE hall_id IN (SELECT id FROM halls WHERE name LIKE 'Demo Hall%'))\",
    \"DELETE FROM condition_reports WHERE allocation_id IN (SELECT id FROM student_room_allocations WHERE student_id IN (SELECT id FROM users WHERE email LIKE 'demo-%@example.com'))\",
    \"DELETE FROM student_room_allocations WHERE student_id IN (SELECT id FROM users WHERE email LIKE 'demo-%@example.com')\",
    \"DELETE FROM porter_room_assignments WHERE porter_id IN (SELECT id FROM users WHERE email LIKE 'demo-%@example.com')\",
    \"DELETE FROM audit_logs WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'demo-%@example.com')\",
    \"DELETE FROM rooms WHERE hall_id IN (SELECT id FROM halls WHERE name LIKE 'Demo Hall%')\",
    \"DELETE FROM halls WHERE name LIKE 'Demo Hall%'\",
    \"DELETE FROM sessions WHERE name = 'Demo Session'\",
    \"DELETE FROM users WHERE email LIKE 'demo-%@example.com'\",
]
for s in stmts:
    db.execute(text(s))
db.commit()
print('demo data removed')
"
```
