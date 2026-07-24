# HAPMS Implementation Task List

This is the working execution plan for the Hostel Asset and Property Management System (HAPMS), derived from `BRD.md` and `TECHNICAL_MVP.md`. It supersedes the original document's calendar (Week 1–4) sequencing: tasks here are ordered strictly by **logical/functional dependency**, not by timeline. There is no fixed deadline baked into this list.

## How to read this file

- Each task is a **complete, demonstrable deliverable** — when marked Done, something real works, not just "code exists."
- Tasks are grouped into **Phases**. Phases are mostly sequential (later phases depend on earlier ones), but tasks _within_ a phase are often independent of each other and can be built in any order or in parallel.
- **Depends on** lists the task IDs that must be Done first. If blank, the task only depends on its phase's prerequisites.
- This list is **structurally extendable** — new tasks can be appended to any phase, or a new Phase 14+ can be added, without renumbering existing work. Do not renumber completed tasks.
- Status values: `Not Started`, `In Progress`, `Blocked`, `Done`.
- Source traceability: each task references the BRD requirement IDs (`BR-x.x`) and/or Technical doc sections (`§x`) it implements, so intent is never lost.

## Status legend

| Symbol | Meaning     |
| ------ | ----------- |
| ⬜     | Not Started |
| 🔵     | In Progress |
| 🟥     | Blocked     |
| ✅     | Done        |

---

## Phase 0 — Project Foundations

Nothing else can start until these exist.

### T0.1 — Backend project scaffold ✅

Initialize the FastAPI project: `app/` layout per `TECHNICAL_MVP.md §4.2` (`main.py`, `core/`, `models/`, `schemas/`, `routers/`, `services/`, `seed/`), dependency management (e.g. `pyproject.toml`/`requirements.txt`), `.env`-based config loading, and a working `/health` endpoint.
**Depends on:** —
**Deliverable check:** `uvicorn app.main:app` runs and `/health` returns 200.
**Notes:** built in `backend/` with `uv` (`uv add`, `uv run`) as the package manager instead of pip/venv; config via `pydantic-settings` reading `.env` (see `backend/.env.example`).

### T0.2 — Frontend project scaffold ✅

Initialize the Next.js (App Router) + Tailwind project per `TECHNICAL_MVP.md §4.3` (`app/`, `lib/`, `components/`), base layout, and a placeholder home page.
**Depends on:** —
**Deliverable check:** `npm run dev` serves a blank styled page.
**Notes:** built in `frontend/` via `create-next-app` (TypeScript, Tailwind v4, App Router, ESLint). `lib/` and `components/` are intentionally left to be populated when Phase 2 (auth) and Phase 3 (admin UI) add their first real files, since empty dirs aren't meaningful scaffolding on their own.

### T0.3 — MySQL database & connection ✅

Provision a local MySQL instance (or docker-compose service), configure SQLAlchemy engine/session in `app/core/`, and set up a migration tool (Alembic). Confirm the backend can connect and run an empty migration.
**Depends on:** T0.1
**Deliverable check:** `alembic upgrade head` runs cleanly against a fresh database.
**Notes:** `docker-compose.yml` (root) defines a MySQL 8.4 service; run with `docker compose up -d` or `podman compose up -d` (rootless podman needs `systemctl --user enable --now podman.socket` once). `app/core/database.py` holds the SQLAlchemy engine/session/`Base`. `alembic/env.py` reads `DATABASE_URL` from app settings and targets `Base.metadata` so Phase 1 models are picked up by autogenerate automatically. Verified `alembic upgrade head` runs clean and creates `alembic_version` in the DB.

### T0.4 — Dev tooling baseline ✅

Linting/formatting for backend (ruff/black or equivalent) and frontend (ESLint/Prettier), a root `.env.example`, and a top-level `README.md` describing how to run both apps locally.
**Depends on:** T0.1, T0.2
**Notes:** backend uses `ruff` for both lint and format (`uv run ruff check .` / `uv run ruff format .`); frontend adds Prettier + `eslint-config-prettier` (`npm run format` / `format:check`) alongside the existing ESLint setup. Root `.env.example` documents the docker-compose MySQL variables. Root `README.md` covers starting the DB, backend, and frontend locally.

---

## Phase 1 — Data Layer

Implements the schema from `TECHNICAL_MVP.md §6`. Each task is model(s) + Alembic migration for one functional cluster of tables.

### T1.1 — Identity & access schema ✅

SQLAlchemy models + migration for `users`, `halls`, `rooms`, `porter_room_assignments` (§6.1–6.4).
**Depends on:** T0.3
**Notes:** models in `backend/app/models/{user,hall,room,porter_room_assignment}.py`, registered via `app/models/__init__.py` and imported in `alembic/env.py` for autogenerate. Enum columns store lowercase values matching the spec exactly (fixed via `values_callable`, since SQLAlchemy's default is the Python member name). Fixed MySQL-specific downgrade ordering issue (index-before-FK-drop) in the generated migration. Verified upgrade → downgrade → upgrade all run clean against the live database.

### T1.2 — Asset reference schema + seed script ✅

Models + migration for `asset_types`, `hall_asset_rules` (§6.5–6.6), plus the seed script loading the exact data in `TECHNICAL_MVP.md §9.1–9.2` (all 4 hall types: regular, tetfund_danjuma, hall_6, hall_7).
**Depends on:** T0.3
**Deliverable check:** seed script is idempotent (safe to re-run) and produces the exact rows in §9.
**Notes:** models in `backend/app/models/{asset_type,hall_asset_rule}.py`; seed data/logic in `backend/app/seed/asset_reference.py`, runnable via `uv run python -m app.seed.run` (`app/seed/run.py`). Verified 8 asset_types + 21 hall_asset_rules rows land exactly as specified, and re-running the seed does not duplicate rows (upsert by natural key). Applied the same MySQL downgrade-ordering fix as T1.1.

### T1.3 — Session & allocation schema ✅

Models + migration for `sessions`, `student_room_allocations` (§6.7–6.8). Implements BR-7.1, BR-5.1.
**Notes:** session model in `backend/app/models/session.py`, named `HostelSession` (not `Session`) to avoid colliding with `sqlalchemy.orm.Session`; allocation model in `student_room_allocation.py`. Verified upgrade → downgrade → upgrade produces the exact columns/enums/constraints from the spec, including `UNIQUE(student_id, session_id)`.
**Depends on:** T1.1

### T1.4 — Baseline & sign-off schema ✅

Models + migration for `room_inventory_baselines`, `baseline_items`, `sign_offs` (§6.9–6.11), including the UNIQUE constraints that back BR-7.4 (one open baseline per room/session) and BR-4.3 (independent corner/shared sign-off rows).
**Depends on:** T1.1, T1.2, T1.3
**Notes:** models in `backend/app/models/{room_inventory_baseline,baseline_item,sign_off}.py`. Reused `SignOffGroup` from `asset_type.py` rather than duplicating it. Verified all three composite UNIQUE constraints (`room_id+session_id`, `baseline_id+asset_type_id`, `baseline_id+student_id+sign_off_group`) landed correctly via `SHOW INDEX`, and upgrade → downgrade → upgrade runs clean. 11 tables now registered on `Base.metadata`.

### T1.5 — Verification schema ✅

Models + migration for `session_end_verifications`, `verification_items` (§6.13–6.14).
**Depends on:** T1.4
**Notes:** models in `backend/app/models/{session_end_verification,verification_item}.py`. `UNIQUE(baseline_id)` enforces the 1:1 relationship with `room_inventory_baselines`. `current_condition` (4 values, incl. `missing`) is a separate enum from `baseline_items.condition` (3 values) per spec. `flag` is system-computed, not user-supplied. Verified upgrade → downgrade → upgrade clean; 13 tables now registered.

### T1.6 — Condition report schema ✅

Model + migration for `condition_reports` (§6.12).
**Notes:** model in `backend/app/models/condition_report.py`; `asset_type_id` nullable since a report may be general. Verified upgrade → downgrade → upgrade clean; 14 tables now registered.
**Depends on:** T1.3

### T1.7 — Audit log schema + logging helper ✅

Model + migration for `audit_logs` (§6.15), plus a reusable service function (e.g. `services/audit.py: record(user, action, entity_type, entity_id, description)`) called by every mutating endpoint built in later phases. Implements BR-6.2, BR-2.9.
**Depends on:** T1.1
**Notes:** model in `backend/app/models/audit_log.py`; helper in `app/services/audit.py` (`record()`, does not commit — caller's transaction owns that so the audit entry lands atomically with the action). Verified it writes a real row end-to-end and upgrade → downgrade → upgrade is clean. **Phase 1 complete: all 15 tables from §6 now exist.**

---

## Phase 2 — Auth & RBAC

Implements BR-1.1 through BR-1.4, BR-6.1, `TECHNICAL_MVP.md §5`.

### T2.1 — Password hashing & JWT utilities ✅

bcrypt hashing helpers; JWT encode/decode with `id`, `role`, expiry claims.
**Depends on:** T1.1
**Notes:** `backend/app/core/security.py` — `hash_password`/`verify_password` (bcrypt), `create_access_token`/`decode_access_token` (PyJWT, HS256, claims `sub`/`role`/`exp`). Fixed `.env.example`'s `JWT_SECRET_KEY` placeholder, which was too short and triggered PyJWT's key-length warning.

### T2.2 — Login endpoint ✅

`POST /auth/login` — validates credentials, issues JWT + role + full_name. Implements BR-1.1.
**Depends on:** T2.1
**Notes:** `POST /api/auth/login` in `backend/app/routers/auth.py`; all routers now mount under `/api` per §8. Invalid email and wrong password both return a generic 401 (no user-enumeration leak). Verified end-to-end against the live DB.

### T2.3 — RBAC dependency ✅

`require_role(...)` FastAPI dependency (and `get_current_user`) used to guard every subsequent route. Returns 403 on role mismatch. Implements BR-6.1.
**Depends on:** T2.1
**Notes:** `backend/app/core/deps.py`. `require_role(*roles)` is a dependency factory (`Depends(require_role(UserRole.ADMIN))`) — added `app.core.deps.require_role` to the Ruff bugbear immutable-calls allowlist so every future protected route doesn't need its own `noqa`. Verified via `TestClient`: no/garbage token → 401, wrong role → 403, valid token → 200 with correct user.

### T2.4 — Admin-triggered password reset endpoint ✅

`POST /auth/reset-password/{user_id}` (Admin only) — generates and returns a temporary password. Implements BR-1.4 (simplified per §5).
**Depends on:** T2.3
**Notes:** `POST /api/auth/reset-password/{user_id}` in `auth.py`; temp password via `secrets.token_urlsafe`, writes an `audit_logs` entry. Verified end-to-end: non-admin → 403, unauthenticated → 401, unknown user → 404, old password stops working, new temp password logs in successfully, audit entry recorded correctly.

### T2.5 — Frontend auth flow ✅

Login page, token storage (memory/cookie), API client wrapper that attaches the Bearer token and centralizes error handling, and a `RoleGuard` component/route wrapper. Implements BR-1.2 (role-based redirect).
**Depends on:** T0.2, T2.2
**Notes:** `lib/auth.ts` (localStorage token + client-side role decode), `lib/api.ts` (`apiFetch` wrapper + `ApiError`), `app/login/page.tsx`, `components/RoleGuard.tsx`, `components/DashboardShell.tsx` + placeholder `/admin`, `/porter`, `/student` pages (fleshed out in Phases 3-5). Verified the full flow end-to-end with a real headless Chrome browser against the live backend — all 7 checks (unauth redirect, valid login, token storage, wrong-role redirect, wrong-password error, logout) passed. **Phase 2 (Auth & RBAC) complete.**

---

## Phase 3 — Admin: Core Configuration

The hard dependency every other role needs data from. Implements BR-2.2 through BR-2.6, BR-7.1–BR-7.5.

### T3.1 — Hall management API ✅

`POST /admin/halls`, `GET /admin/halls`. Implements BR-2.2, BR-2.3 (category is derived from hall_type per §12).
**Depends on:** T1.1, T2.3, T1.7
**Notes:** `app/routers/admin.py`; category derivation lives in new `app/services/asset_rules.py` (will be extended by T4.2). Duplicate hall name → clean 409, not a raw IntegrityError. Verified end-to-end: category derivation correct for both Regular and Special hall_types, 409/401/422 cases, and audit log entries all confirmed against the live server.

### T3.2 — Room management API ✅

`POST /admin/rooms`, `GET /admin/rooms`. Implements BR-2.2, BR-2.4 (asset applicability derived from hall_type, enforced later in T4.2).
**Depends on:** T3.1
**Notes:** `capacity` is server-derived from `hall_type` via new `room_capacity()` in `asset_rules.py` (BRD §6.1–6.4 occupancy), never entered by the Admin. **Bug found & fixed**: `UNIQUE(hall_id, room_number, corner_label)` doesn't catch duplicates when `corner_label` is NULL (true for every hall except Hall 7) since SQL treats NULL as distinct from NULL — added an explicit NULL-safe application-level duplicate check before insert. Verified end-to-end including this fix.

### T3.3 — User account management API ✅

`POST /admin/users`, `GET /admin/users`, `PATCH /admin/users/{id}/deactivate`. Implements BR-1.3, BR-2.5.
**Depends on:** T1.1, T2.3, T1.7
**Notes:** request has no password field (§8.2), so — matching T2.4's pattern — a temp password is generated and returned once. Only porter/student roles creatable here (400 otherwise); deactivation is soft-disable, not delete. Verified end-to-end including actually logging in with the returned temp password and confirming a deactivated user can no longer log in.

### T3.4 — Porter-room assignment API ✅

`POST /admin/porter-assignments`. Implements BR-2.6, and underpins BR-3.1.
**Depends on:** T3.2, T3.3
**Notes:** validates `porter_id` is an actual porter (400 if student/admin, 404 if missing) and `room_id` exists (404). `UNIQUE(porter_id, room_id)` has no nullable columns so the plain `IntegrityError` catch is sufficient (unlike T3.2's room case). Verified end-to-end against the live server.

### T3.5 — Session lifecycle API ✅

`POST /admin/sessions`, `GET /admin/sessions`, `PATCH /admin/sessions/{id}/close` with the verification-complete gate (§7.9). Implements BR-7.1 through BR-7.5.
**Depends on:** T1.3, T1.7
**Note:** the close-gate check depends on `room_inventory_baselines.locked`, so its full enforcement can only be _tested_ end-to-end after T8.3, but the endpoint itself can be built now against the schema.
**Resolved ambiguity:** §6.7/§12 say exactly one session is active at a time (app-enforced), but §7.9 says creation doesn't auto-close others. Resolved as: `POST /admin/sessions` returns 409 if a session is already active, rather than auto-closing or allowing two actives — satisfies both statements since the "lock out" §7.9 warns about can't happen (the attempt just fails, forcing an explicit close first). `get_active_session()` in new `app/services/sessions.py` is the single lookup point T4.3/T5.1 will use. Verified the close-gate end-to-end by manually inserting an unlocked baseline (ahead of T4.3) and confirming it blocks closure with the correct `unverified_room_ids`, then unblocks once locked. **Only T3.6–T3.10 (Admin frontend) remain to finish Phase 3.**

### T3.6 — Admin frontend: Halls page ✅

List + create-hall UI.
**Depends on:** T2.5, T3.1
**Notes:** `app/admin/halls/page.tsx`. Added `lib/useApiResource.ts` (fetch-on-mount hook with loading/error/refetch) and `components/AdminNav.tsx` (grows one link per T3.7–T3.10 page) — both deliberate reusable infrastructure given how many remaining pages need the same pattern. Verified end-to-end with a real headless Chrome browser: nav, empty state, create (both category derivations), duplicate-name form error.

### T3.7 — Admin frontend: Rooms page ✅

List + create-room UI, scoped to a hall.
**Depends on:** T2.5, T3.2
**Notes:** `app/admin/rooms/page.tsx`. List + create with a hall `<select>`, room number, optional corner label (Hall 7); capacity shown per row (derived server-side); hall name joined via a `hallsById` map. Added the Rooms link to `AdminNav`. Verified end-to-end in a real headless Chrome: empty state, Regular-hall capacity 8, Hall 7 capacity 2 with corner label, no-hall client validation, and duplicate-room 409 surfaced in the UI.

### T3.8 — Admin frontend: Users page ✅

List + create Porter/Student accounts, deactivate action, trigger password reset (T2.4).
**Depends on:** T2.5, T3.3, T2.4
**Notes:** `app/admin/users/page.tsx`. List + create (role select limited to Porter/Student); the one-time temporary password from create *and* from reset is shown in a dismissable banner (no email delivery this phase). Per-row Reset-password and Deactivate actions; Deactivate hidden for admin/inactive rows. Verified end-to-end in a real headless Chrome: create shows the temp-password banner and the row, reset re-surfaces a new temp password, deactivate flips status to Inactive.

### T3.9 — Admin frontend: Porter assignment UI ✅

Assign a Porter to one or more rooms.
**Depends on:** T2.5, T3.4
**Notes:** `app/admin/porter-assignments/page.tsx`. Pick an active porter + multi-select rooms (checkbox list with hall/room/corner labels); the single-room API is called once per selected room so each room reports its own success/failure. Verified end-to-end: successful assignment shows ✓, and re-assigning the same porter+room shows ✗ with the 409 "already assigned" message.

### T3.10 — Admin frontend: Sessions page ✅

Create a session, view open/closed sessions, close a session (surfacing the unverified-rooms list on 409).
**Depends on:** T2.5, T3.5
**Notes:** `app/admin/sessions/page.tsx`. Create (name + datetime-local, sent as UTC ISO), list active/closed, per-row Close. Extended `lib/api.ts` so `ApiError` carries the raw `detail` and `extractErrorMessage` handles object-shaped detail, letting the close-gate 409's message + `unverified_room_ids` reach the UI. Verified end-to-end: create shows Active, a second create is blocked (single-active-session 409), close succeeds when no baselines block it, and — with an unlocked baseline inserted (ahead of T4.3) — Close is blocked with the unverified room IDs shown and the session left Active. **Phase 3 (Admin console) is complete.**

---

## Phase 4 — Porter: Baseline Entry

The first half of the "core loop." Implements BR-3.1 through BR-3.3.

### T4.1 — Assigned rooms endpoint ✅

`GET /porter/rooms` — filtered to `porter_room_assignments` for the logged-in Porter (§7.6). Implements BR-3.1.
**Depends on:** T1.4, T2.3, T3.4
**Notes:** `app/routers/porter.py:list_assigned_rooms`. Returns only the caller's assigned rooms with hall name, capacity, and active-session baseline status (`has_baseline`, `baseline_id`, `baseline_locked`, `shared_confirmed` per §7.8). Verified with curl: porter sees only their room, a porter with no assignments gets `[]`, an admin hitting the route gets 403.

### T4.2 — Room asset-types endpoint ✅

`GET /porter/rooms/{room_id}/asset-types` — category-filtered valid asset types with default quantities, per §7.1. Implements BR-2.4, BR-3.3.
**Depends on:** T1.2, T4.1
**Notes:** `app/routers/porter.py:room_asset_types` + `app/services/baselines.py:valid_asset_rules_for_room`. Returns the hall_type's `hall_asset_rules` joined to asset types (id, code, display_name, sign_off_group, default_quantity, notes), ordered by asset id. Scoping enforced via a shared `_assigned_room_or_403` helper (404 missing, 403 not-yours). Verified: Hall 7 returns exactly its 6 valid types with correct defaults; unassigned room 403; missing room 404.

### T4.3 — Create baseline endpoint ✅

`POST /porter/rooms/{room_id}/baseline` — creates baseline + items; returns 409 with a friendly message if an open baseline already exists for the room's active session (§7.9, BR-7.4). Writes an audit log entry. Implements BR-3.2.
**Depends on:** T1.4, T4.2, T1.7, T3.5
**Notes:** `app/routers/porter.py:create_baseline`. Validates every item against the hall's valid asset types (400), rejects duplicate asset types in the payload (400) and empty payloads (422), requires an active session (409), and blocks a second open baseline (409 friendly pre-check + UNIQUE backstop). Writes a `CREATE_BASELINE` audit entry in the same transaction. Verified with curl: create round-trip, duplicate 409, invalid/duplicate item 400, empty 422, and `has_baseline` reflected on `GET /porter/rooms`.

### T4.4 — Chair-to-table auto-match logic ✅

Backend default-suggestion behavior (or frontend convenience) so chair quantity defaults to table quantity when set, per §7.2. Remains editable.
**Depends on:** T4.3
**Notes:** Implemented as the UI convenience the spec calls for, inside the baseline form (`app/porter/rooms/[roomId]/baseline/page.tsx`): changing the Table quantity sets the Chair quantity to match, and the Chair stays editable afterward. E2E-verified (table→3 sets chair→3, then chair overridden to 2) and confirmed persisted (chair stored as 2).

### T4.5 — Porter frontend: My Assigned Rooms page ✅

List of assigned rooms with baseline/verification status indicators (placeholder for pending flags, filled in during Phase 10).
**Depends on:** T2.5, T4.1
**Notes:** `app/porter/page.tsx`. The Porter dashboard lists assigned rooms with hall/room/corner/capacity and a baseline status (Not recorded / Recorded / Locked); rooms without a baseline link to the entry form. Verified end-to-end in real headless Chrome.

### T4.6 — Porter frontend: Baseline Entry Form ✅

Category-filtered form (asset type, quantity, condition) with chair-auto-match (T4.4), submitting to T4.3.
**Depends on:** T4.5, T4.3, T4.4
**Notes:** `app/porter/rooms/[roomId]/baseline/page.tsx`. Renders the asset types from T4.2 grouped into Corner and Shared, pre-filled with default quantities (untouched rows fall back to their default at render/submit — no state seeding in an effect); submits all items and returns to the room list, surfacing the duplicate-baseline 409. Verified end-to-end (13 checks) including a DB check that persisted values matched the UI. **Phase 4 (Porter baseline entry — the first half of the core loop) is complete.**

---

## Phase 5 — Student: Onboarding & Room View

The Kofa bridge and read-only room view. Implements BR-1.5, BR-5.1, BR-5.2, BR-4.1, BR-4.2.

### T5.1 — Kofa bridge endpoints ✅

`GET /student/rooms/available` (dropdown source), `POST /student/allocation` (creates `student_room_allocations` row for the active session). Implements BR-1.5, BR-5.1, BR-5.2 (dropdown, not free text, per §3).
**Depends on:** T1.3, T2.3, T3.5, T1.7
**Notes:** `app/routers/student.py`. `rooms/available` lists every Admin-created room (capacity is informational only, not filtered by occupancy — §12). `POST /allocation` 409s if no active session, 404s on unknown room, and 409s (friendly pre-check + UNIQUE backstop) if the Student already has an allocation this session — there is no update-allocation endpoint in this phase. Verified via curl: available-rooms listing, successful allocation, duplicate-allocation 409, unknown-room 404, cross-role 403s.

### T5.2 — Student room view endpoint ✅

`GET /student/room` — baseline items for the student's active allocation, split into corner/shared groups by `asset_types.sign_off_group` (§7.3). Implements BR-4.1, BR-4.2.
**Depends on:** T1.4, T5.1, T4.3
**Notes:** Same router. 404 when the Student has no active-session allocation (used by the frontend to decide onboarding vs. room view). `has_baseline: false` with empty corner/shared arrays when the Porter hasn't recorded a baseline yet — sign-off state deliberately not included yet (added in Phase 6, T6.1/T6.2, same pattern as `GET /porter/rooms`'s `shared_confirmed`). Verified via curl for both the baseline-recorded and not-yet-recorded cases.

### T5.3 — Student frontend: first-login onboarding ✅

Room/hall dropdown selection flow shown on first login, submitting to T5.1.
**Depends on:** T2.5, T5.1
**Notes:** Folded into `frontend/app/student/page.tsx` rather than a separate route — the page fetches `/student/room` on mount and shows the onboarding dropdown only on a 404 (no allocation yet), reusing the same `RoleGuard`/`DashboardShell` shell.

### T5.4 — Student frontend: My Room page ✅

Displays corner/shared asset groupings from T5.2 (read-only at this stage; sign-off added in Phase 6).
**Depends on:** T5.3, T5.2
**Notes:** Same file — once `/student/room` resolves, renders "My Corner" / "Shared Room Items" tables (asset, qty, condition), or a "not recorded yet" message when `has_baseline` is false. Verified end-to-end in real Chrome: onboarding dropdown → allocation → My Room for a no-baseline room, plus My Room with populated Shared items for a baseline'd room; 11/11 checks passed.

---

## Phase 6 — Student: Sign-off & Dispute

Implements BR-4.3, BR-4.4, BR-4.8 through BR-4.14 (the full sign-off + dispute + shared-confirmation model).

### T6.1 — Sign-off endpoint ✅

`POST /student/signoff` — creates an independent `sign_offs` row per (baseline, student, group); accepts `status` ('confirmed'/'contested') and an optional/required `comment`. Writes an audit log entry. Implements BR-4.3, BR-4.4, BR-4.8, BR-4.9.
**Depends on:** T1.4, T5.2, T1.7
**Notes:** `app/routers/student.py`. Scoped via `_student_baseline_or_403`: 404 if the baseline doesn't exist, 403 if it isn't for the Student's currently-allocated room in the active session. 409 if the baseline is already `locked`; 400 if `status='contested'` with no (or blank) comment; 409 on a duplicate (baseline, student, group) sign-off (friendly pre-check + UNIQUE backstop). `GET /student/room` extended with `corner_sign_off`/`shared_sign_off` (this student's own, or null) so the frontend can render already-signed state. Verified via curl: happy path for both groups, blank-comment-on-dispute 400, duplicate 409, locked-baseline 409.

### T6.2 — Shared Room Item confirmation logic ✅

Derived `shared_confirmed` computation (§7.8, BR-4.12–4.13) surfaced on `GET /porter/rooms` (extend T4.1) and in baseline detail responses.
**Depends on:** T6.1, T4.1
**Notes:** Already implemented in T4.1's `GET /porter/rooms` (any 'shared' sign-off row, confirmed or contested, flips `shared_confirmed` true) — no code change needed here, just verification against real sign-off data now that T6.1 exists. Confirmed via curl: a contested shared sign-off correctly set `shared_confirmed: true`.

### T6.3 — Student frontend: sign-off UI ✅

Two independent sign-off actions (corner, shared) on the My Room page, each able to carry a dispute note. Implements BR-4.14.
**Depends on:** T5.4, T6.1
**Notes:** `SignOffPanel` in `frontend/app/student/page.tsx`, rendered once per group under its item table. Confirm is one click; Dispute reveals a required textarea (blocked client-side with an inline message if empty) before submitting. Once signed, the panel becomes read-only (status + comment), matching the "independent, one-shot" sign-off model — no edit/undo in this phase. Verified end-to-end in real Chrome across two students on the same room (independent corner sign-off per BR-4.14): 11/11 checks passed, including the empty-dispute-comment guard and persistence across reload.

### T6.4 — Porter/Admin visibility of dispute comments ✅

Extend `GET /porter/baselines/{id}` (built in T8.1) and the Admin audit log view (T9.4) to surface `sign_offs.comment`. Implements BR-4.10.
**Depends on:** T6.1, T8.1, T9.4
**Note:** listed here for traceability; actual implementation happens alongside T8.1/T9.4 once those exist — mark Done only when both surfaces show dispute comments.
**Notes:** Porter side landed with T8.1. Admin side landed with T9.4: `create_signoff` (T6.1, in `app/routers/student.py`) now embeds the comment directly into the audit-log description (e.g. `Contested sign-off (shared) for baseline 11 — "Fan makes a loud noise"`), which required widening `audit_logs.description` from VARCHAR(255) to TEXT (migration `5058c52a1040`) so a 500-char dispute comment can never get silently truncated. Verified via curl: `GET /admin/audit-log` shows the full comment text in the entry.

---

## Phase 7 — Student: Condition Reports & History

Implements BR-4.5, BR-4.6.

### T7.1 — Condition report endpoint ✅

`POST /student/condition-report` — free-text, optionally tagged to an asset type. Writes an audit log entry.
**Depends on:** T1.6, T5.1, T1.7
**Notes:** `app/routers/student.py`. Tied to the Student's current `ACTIVE` allocation (not a specific baseline), so it stays submittable "at any point before vacating" per BR-4.5, even after the room's baseline is locked (§7.5: additive, not an edit). 404 if the Student has no active allocation or an invalid `asset_type_id`; description is required (`Field(min_length=1)`). Verified via curl: general report, asset-tagged report, blank-description 422, invalid-asset-type 404, no-allocation 404.

### T7.2 — Student history endpoint ✅

`GET /student/history` — read-only list of the student's past sessions/allocations. Implements BR-4.6, BR-4.7 (no edit capability exists on this path by construction).
**Depends on:** T1.3, T5.1
**Notes:** Every `student_room_allocations` row for the caller (any session, any status), most recent first, joined to room/hall/session for display. Verified via curl for both a student with history and one with none (empty list, not an error).

### T7.3 — Student frontend: condition report form ✅

Simple form submitting to T7.1, accessible from My Room page.
**Depends on:** T5.4, T7.1
**Notes:** `ConditionReportForm` in `frontend/app/student/page.tsx`, collapsed behind a "Report a condition change" link on My Room. Optional "related item" dropdown built from the room's own corner+shared asset types (deduped); blank descriptions blocked client-side before the request fires.

### T7.4 — Student frontend: history page ✅

Read-only list view from T7.2.
**Depends on:** T2.5, T7.2
**Notes:** New route `frontend/app/student/history/page.tsx`, linked from My Room via "View my session history →" and back again via "← My Room". Verified end-to-end in real Chrome: condition-report submit (dropdown, client-side empty-description guard, success message), history navigation showing the session/room/status row, and the empty-history state for an unallocated student; 12/12 checks passed.

---

## Phase 8 — Porter: Session-End Verification & Locking

The second half of the "core loop." Implements BR-3.4, BR-3.5, BR-6.3, BR-7.3.

### T8.1 — Baseline detail endpoint ✅

`GET /porter/baselines/{id}` — items, lock status, and per-group sign-off summary (status + comment). Implements the read side of BR-4.10.
**Depends on:** T4.3, T6.1
**Notes:** `app/routers/porter.py`, scoped via a new `_assigned_baseline_or_403` (404 unknown baseline, 403 if its room isn't the caller's). Returns `corner_sign_offs`/`shared_sign_offs` as lists of `{student_id, student_name, status, comment, signed_at}` — a list, not a single summary, since a room can have multiple occupants each with their own independent sign-off per group. Also returns `shared_confirmed` (T6.2's note that it belongs here too). Verified via curl: full detail with a contested shared sign-off's comment visible, cross-porter 403, unknown-baseline 404.

### T8.2 — Auto-flagging algorithm ✅

Implement the exact decision logic from `TECHNICAL_MVP.md §7.4` (missing / damaged / quantity_mismatch / ok) as a pure, unit-testable service function.
**Depends on:** T1.5
**Notes:** `app/services/verification.py`'s `compute_flag()` - pure function, no DB. Added `pytest` as a dev dependency and `backend/tests/test_verification.py` with 7 unit tests covering every branch (missing wins over all, newly-damaged vs. already-damaged-so-not-re-flagged, quantity shortfall vs. increase vs. exact match, and damaged-wins-over-quantity-mismatch branch ordering). All 7 pass (`uv run pytest`).

### T8.3 — Submit verification endpoint ✅

`POST /porter/baselines/{id}/verify` — creates `session_end_verifications` + `verification_items` using T8.2's logic, and in the same transaction sets `room_inventory_baselines.locked = TRUE` (§7.5). Writes an audit log entry. Implements BR-3.4, BR-3.5.
**Depends on:** T8.2, T8.1
**Notes:** Same router. Requires every baseline item to appear exactly once in the submitted `items` (400 on an unknown baseline_item_id, a duplicate, or any missing) - no partial verification. 409 if already locked (pre-check + UNIQUE(baseline_id) backstop on `session_end_verifications`). Verified via curl exercising all three flag types in one submission (table→missing, chair→damaged, bunk_bed→quantity_mismatch, mattress/cupboard/window_blind→ok) plus the validation 400s and re-verify 409.

### T8.4 — Locking enforcement ✅

Add the 409-on-locked guard to every baseline/sign-off mutation endpoint (T4.3 edit paths if any, T6.1) so a locked baseline can no longer be altered. Confirm `condition_reports` (T7.1) remains allowed post-lock. Implements BR-6.3.
**Depends on:** T8.3, T6.1, T7.1
**Notes:** No new guard code needed — T6.1's sign-off endpoint already 409s on a locked baseline, and there's no baseline-item edit endpoint to guard (baseline items are only ever set once, at T4.3 creation, which is separately protected by the one-baseline-per-room-per-session check). Verified via curl: sign-off on the now-locked baseline 409s, and a condition report on the same allocation still succeeds (200) post-lock, confirming it stays additive rather than edit-gated.

### T8.5 — Porter frontend: Session-End Verification screen ✅

Shows baseline vs. current-state entry form, submits to T8.3, and renders the returned flags (missing/damaged/quantity_mismatch) visually.
**Depends on:** T4.5, T8.1, T8.3
**Notes:** New route `frontend/app/porter/rooms/[roomId]/verify/page.tsx`, linked from the Porter dashboard's "Verify & lock" action (replacing the old "Recorded" static text once a baseline exists and isn't locked yet). Per-item quantity/condition inputs default to the baseline's own values; on submit, shows a results table with color-coded flag labels (green OK, red Missing, orange Damaged, amber Quantity mismatch) and a way back to the dashboard. Verified end-to-end in real Chrome: form renders all items, submitting a mix of all three flag types renders them correctly, and revisiting an already-locked room's verify URL shows the locked-error state instead of the form.

---

## Phase 9 — Admin: Reporting, Dashboard, Audit Trail

Implements BR-2.1, BR-2.7, BR-2.9.

### T9.1 — Admin dashboard summary endpoint ✅

`GET /admin/dashboard/summary` — total rooms, total flagged issues (count of non-'ok' `verification_items` in the active session, per §7.4). Implements BR-2.1.
**Depends on:** T8.3, T3.1
**Notes:** New `app/schemas/reports.py` + endpoints appended to `app/routers/admin.py`. `total_flagged_issues` is 0 when no session is active (not an error). Verified via curl: 0/0 on an empty DB, then 1/2 after recording a baseline, disputing shared, and verifying with a missing + a quantity-mismatch item.

### T9.2 — Baselines report endpoint ✅

`GET /admin/reports/baselines` — room, session, created_by, created_at, shared_confirmed. Implements BR-2.7 (basic/unfiltered per §3).
**Depends on:** T4.3, T6.2
**Notes:** All baselines across every session (not just the active one), most recent first. Verified via curl.

### T9.3 — Verifications report endpoint ✅

`GET /admin/reports/verifications` — room, session, flagged_count, verified_at. Implements BR-2.7.
**Depends on:** T8.3
**Notes:** `flagged_count` is a per-verification count of non-'ok' `verification_items`. Verified via curl against a verification with 2 flagged items out of 3.

### T9.4 — Audit log endpoint ✅

`GET /admin/audit-log` — reverse-chronological feed including dispute comments. Implements BR-2.9, BR-4.10.
**Depends on:** T1.7
**Notes:** `limit`/`offset` query params (default 100, max 500) for pagination; ties `created_at DESC, id DESC` to keep pages stable. This closes out T6.4 — see its notes for the audit_logs.description widening this required. Verified via curl: dispute comment visible in the feed, pagination returns disjoint pages, cross-role 403.

### T9.5 — Admin frontend: Dashboard page ✅

Renders T9.1's summary.
**Depends on:** T2.5, T9.1
**Notes:** `frontend/app/admin/page.tsx` rewritten from its Phase-3 placeholder into two stat tiles (Total rooms, Flagged asset problems). `AdminNav` gained a "Dashboard" link (pointing at `/admin` itself) plus "Reports" and "Audit Log".

### T9.6 — Admin frontend: Reports pages ✅

Renders T9.2 and T9.3 as list views.
**Depends on:** T2.5, T9.2, T9.3
**Notes:** Single route `frontend/app/admin/reports/page.tsx` with two stacked tables (Baselines, Verifications) — simple/unfiltered, matching the backend's scope decision.

### T9.7 — Admin frontend: Audit trail page ✅

Renders T9.4 as a scrollable/paginated feed.
**Depends on:** T2.5, T9.4
**Notes:** `frontend/app/admin/audit-log/page.tsx` — When/Who/What/Action columns, "Load more" button paging by 50 using T9.4's `limit`/`offset`. Verified end-to-end in real Chrome across all of T9.5-T9.7: dashboard tiles, both report tables, and the audit feed showing the dispute comment; 8/8 checks passed.

---

## Phase 10 — Pending-Action Indicators (Conditional Feature)

Implements BR-8.1 through BR-8.3 (explicitly marked Conditional in the BRD). Build this phase only after the entire core loop (Phases 4–8) is complete and demonstrably working end-to-end — treat that as a pass/fail gate, not a partial attempt (per `TECHNICAL_MVP.md §14` risk mitigation). If skipped or partially done, no other phase is affected; this phase only adds computed fields to existing responses.

### T10.1 — Student pending-signoff flag ✅

Extend `GET /student/room` (T5.2) with a derived flag: pending if the active baseline is missing a corner or shared sign-off from this student (§7.10). Implements BR-8.1.
**Depends on:** T5.2, T6.1
**Notes:** `pending = has_baseline && (corner_sign_off is None or shared_sign_off is None)` in `get_my_room` (`app/routers/student.py`) - trivial once `corner_sign_off`/`shared_sign_off` already existed from T6.1. Verified via curl: a student with a complete sign-off pair gets `pending: false`, one with none gets `pending: true`.

### T10.2 — Porter pending-room flags ✅

Extend `GET /porter/rooms` (T4.1) with derived flags: no-baseline-yet, and baseline-unlocked-pending-verification. Implements BR-8.2.
**Depends on:** T4.1, T8.3
**Notes:** `no_baseline_yet` and `pending_verification` added to `PorterRoomResponse`; both false when no session is active (nothing to be pending against). Verified via curl across three rooms: no baseline yet, baseline recorded but unverified (both true/false as expected), and the same fields checked via automated browser.

### T10.3 — Admin pending count ✅

Extend `GET /admin/dashboard/summary` (T9.1) with `pending_signoff_count`. Implements BR-8.3.
**Depends on:** T9.1, T6.1
**Notes:** New `app/services/pending.py`: `pending_signoff_room_count()` counts rooms in the active session where at least one current occupant is missing a complete corner+shared sign-off pair (rooms with no baseline or no current occupants don't count). Verified via curl with a 3-room, 3-student scenario: one room with one occupant fully signed off and one occupant with no sign-offs at all (counts as pending), one room with its single occupant fully signed off (doesn't count), and one room with no baseline (doesn't count) — `pending_signoff_count` came back exactly 1.

### T10.4 — Frontend pending indicators ✅

Surface the three flags above as visible badges/banners on Student My Room, Porter Assigned Rooms, and Admin Dashboard.
**Depends on:** T10.1, T10.2, T10.3, T5.4, T4.5, T9.5
**Notes:** Student My Room shows an amber "Action needed: sign off on your Check-in Slip below" banner when `pending`. Porter dashboard's status column now reads directly off `no_baseline_yet`/`pending_verification` (rather than re-deriving from `has_baseline`/`baseline_locked`) and adds a "Pending verification" label distinct from "Not recorded". Admin dashboard gained a third stat tile, "Pending sign-offs". Verified end-to-end in real Chrome across all three roles against the same 3-room scenario from T10.3; 5/5 checks passed.

**Phase 10 (Pending-Action Indicators) is complete.**

---

## Phase 11 — Cross-Role Quality & Hardening

Not a single feature — a pass over everything built so far to confirm the system-wide rules in `BRD.md §7` actually hold.

### T11.1 — Role-based data-scoping audit ⬜

Verify (via tests and manual checks) that: a Student can never fetch another student's room; a Porter can never fetch/act on an unassigned room; a Porter cannot reach any `/admin/*` route. Implements BR-6.1.
**Depends on:** Phases 3–8 complete

### T11.2 — Session-lifecycle edge case tests ⬜

Verify duplicate-baseline rejection (409, friendly message) and the session-close verification gate (409 + outstanding room list) behave exactly as specified in §7.9.
**Depends on:** T4.3, T3.5, T8.3

### T11.3 — Input validation & error-handling pass ⬜

Review every endpoint's Pydantic request/response schemas; ensure constraint violations (unique, required fields, invalid enum values) surface as clean 4xx errors, not raw stack traces or database exceptions.
**Depends on:** all Phase 3–9 endpoints

### T11.4 — Full acceptance-criteria walkthrough ⬜

Manually execute every checklist item in `BRD.md §10` and `TECHNICAL_MVP.md §13` against the running system; log and fix defects found.
**Depends on:** Phases 1–9 complete (Phase 10 items included if built)

### T11.5 — Demo/UAT seed data script ⬜

A separate seed script (distinct from T1.2's structural seed) that populates 2–3 halls of different hall_types, several rooms, a few students, one deliberately-contested sign-off, and one deliberately-flagged verification discrepancy, so the system can be demonstrated or UAT-tested without live data entry.
**Depends on:** T11.4

---

## Phase 12 — Delivery

### T12.1 — Environment configuration for deployment ⬜

Production-style `.env` handling, secrets management, CORS configuration for the deployed frontend origin.
**Depends on:** T0.4

### T12.2 — Deployment ⬜

Deploy backend + MySQL and frontend to chosen hosting; run migrations (T1.1–T1.7) against the deployed database; run the seed script (T1.2).
**Depends on:** T12.1, all of Phase 1

### T12.3 — UAT with sample accounts ⬜

Create one real Admin, Porter, and Student account on the deployed system and walk through the full lifecycle (T11.4's checklist) against it.
**Depends on:** T12.2, T11.4

### T12.4 — Project documentation ⬜

Finalize `README.md`: architecture overview, setup/run instructions, environment variables, seed data, and a pointer to `docs/BRD.md` / `docs/TECHNICAL_MVP.md` / this file for full context.
**Depends on:** T12.2

---

## Phase 13 — Future Enhancements (Backlog)

Explicitly out of the initial completion scope per `TECHNICAL_MVP.md §11`, but each is written as a ready-to-pick-up task so the plan is structurally extendable without rework. Not required for project completion.

### T13.1 — Photo evidence on baseline/verification items ⬜

Implements BR-9.1, BR-9.3. Requires a new `photos` table (linked to `baseline_items` or `verification_items`) and file storage integration.
**Depends on:** T4.3, T8.3

### T13.2 — Photo evidence on condition reports ⬜

Implements BR-9.2. Extends `condition_reports` with an optional linked photo.
**Depends on:** T7.1, T13.1

### T13.3 — Kofa live API integration ⬜

Replace the manual dropdown (T5.1) with a live API call, if/when the university exposes one. Explicitly out of scope per BR-5.2.
**Depends on:** T5.1

### T13.4 — Filterable/exportable Admin reports ⬜

Extend T9.2/T9.3 with hall/session/asset-type filters and export (CSV/PDF). Implements BR-2.7 (full), BR-2.8.
**Depends on:** T9.2, T9.3

### T13.5 — Filterable audit trail ⬜

Extend T9.4 with filters (by user, action type, date range).
**Depends on:** T9.4

### T13.6 — Formal dispute-resolution workflow ⬜

Add an explicit resolve/acknowledge action on a contested sign-off, beyond the current "permanent record" model. Would need stakeholder sign-off since BRD marks this Won't Have (BR-4.11).
**Depends on:** T6.1

### T13.7 — Email/SMS notification channel ⬜

Replace/augment the in-app pending indicators (Phase 10) with real notifications. Explicitly out of scope per BR-8.4.
**Depends on:** Phase 10 complete

---

## Dependency overview (phase level)

```
Phase 0 (Foundations)
   └─> Phase 1 (Data Layer)
          └─> Phase 2 (Auth & RBAC)
                 └─> Phase 3 (Admin Core Config)
                        ├─> Phase 4 (Porter: Baseline) ──┐
                        └─> Phase 5 (Student: Onboarding)─┼─> Phase 6 (Sign-off & Dispute)
                                                           │        └─> Phase 7 (Condition Reports & History)
                                                           └────────┴─> Phase 8 (Session-End Verification & Locking)
                                                                             └─> Phase 9 (Admin Reporting/Dashboard/Audit)
                                                                                    └─> Phase 10 (Pending Indicators — conditional)
                                                                                           └─> Phase 11 (Hardening)
                                                                                                  └─> Phase 12 (Delivery)

Phase 13 (Future Enhancements) branches off Phases 4–10 individually; not required for completion.
```
