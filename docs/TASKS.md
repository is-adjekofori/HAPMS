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

### T2.3 — RBAC dependency ⬜

`require_role(...)` FastAPI dependency (and `get_current_user`) used to guard every subsequent route. Returns 403 on role mismatch. Implements BR-6.1.
**Depends on:** T2.1

### T2.4 — Admin-triggered password reset endpoint ⬜

`POST /auth/reset-password/{user_id}` (Admin only) — generates and returns a temporary password. Implements BR-1.4 (simplified per §5).
**Depends on:** T2.3

### T2.5 — Frontend auth flow ⬜

Login page, token storage (memory/cookie), API client wrapper that attaches the Bearer token and centralizes error handling, and a `RoleGuard` component/route wrapper. Implements BR-1.2 (role-based redirect).
**Depends on:** T0.2, T2.2

---

## Phase 3 — Admin: Core Configuration

The hard dependency every other role needs data from. Implements BR-2.2 through BR-2.6, BR-7.1–BR-7.5.

### T3.1 — Hall management API ⬜

`POST /admin/halls`, `GET /admin/halls`. Implements BR-2.2, BR-2.3 (category is derived from hall_type per §12).
**Depends on:** T1.1, T2.3, T1.7

### T3.2 — Room management API ⬜

`POST /admin/rooms`, `GET /admin/rooms`. Implements BR-2.2, BR-2.4 (asset applicability derived from hall_type, enforced later in T4.2).
**Depends on:** T3.1

### T3.3 — User account management API ⬜

`POST /admin/users`, `GET /admin/users`, `PATCH /admin/users/{id}/deactivate`. Implements BR-1.3, BR-2.5.
**Depends on:** T1.1, T2.3, T1.7

### T3.4 — Porter-room assignment API ⬜

`POST /admin/porter-assignments`. Implements BR-2.6, and underpins BR-3.1.
**Depends on:** T3.2, T3.3

### T3.5 — Session lifecycle API ⬜

`POST /admin/sessions`, `GET /admin/sessions`, `PATCH /admin/sessions/{id}/close` with the verification-complete gate (§7.9). Implements BR-7.1 through BR-7.5.
**Depends on:** T1.3, T1.7
**Note:** the close-gate check depends on `room_inventory_baselines.locked`, so its full enforcement can only be _tested_ end-to-end after T8.3, but the endpoint itself can be built now against the schema.

### T3.6 — Admin frontend: Halls page ⬜

List + create-hall UI.
**Depends on:** T2.5, T3.1

### T3.7 — Admin frontend: Rooms page ⬜

List + create-room UI, scoped to a hall.
**Depends on:** T2.5, T3.2

### T3.8 — Admin frontend: Users page ⬜

List + create Porter/Student accounts, deactivate action, trigger password reset (T2.4).
**Depends on:** T2.5, T3.3, T2.4

### T3.9 — Admin frontend: Porter assignment UI ⬜

Assign a Porter to one or more rooms.
**Depends on:** T2.5, T3.4

### T3.10 — Admin frontend: Sessions page ⬜

Create a session, view open/closed sessions, close a session (surfacing the unverified-rooms list on 409).
**Depends on:** T2.5, T3.5

---

## Phase 4 — Porter: Baseline Entry

The first half of the "core loop." Implements BR-3.1 through BR-3.3.

### T4.1 — Assigned rooms endpoint ⬜

`GET /porter/rooms` — filtered to `porter_room_assignments` for the logged-in Porter (§7.6). Implements BR-3.1.
**Depends on:** T1.4, T2.3, T3.4

### T4.2 — Room asset-types endpoint ⬜

`GET /porter/rooms/{room_id}/asset-types` — category-filtered valid asset types with default quantities, per §7.1. Implements BR-2.4, BR-3.3.
**Depends on:** T1.2, T4.1

### T4.3 — Create baseline endpoint ⬜

`POST /porter/rooms/{room_id}/baseline` — creates baseline + items; returns 409 with a friendly message if an open baseline already exists for the room's active session (§7.9, BR-7.4). Writes an audit log entry. Implements BR-3.2.
**Depends on:** T1.4, T4.2, T1.7, T3.5

### T4.4 — Chair-to-table auto-match logic ⬜

Backend default-suggestion behavior (or frontend convenience) so chair quantity defaults to table quantity when set, per §7.2. Remains editable.
**Depends on:** T4.3

### T4.5 — Porter frontend: My Assigned Rooms page ⬜

List of assigned rooms with baseline/verification status indicators (placeholder for pending flags, filled in during Phase 10).
**Depends on:** T2.5, T4.1

### T4.6 — Porter frontend: Baseline Entry Form ⬜

Category-filtered form (asset type, quantity, condition) with chair-auto-match (T4.4), submitting to T4.3.
**Depends on:** T4.5, T4.3, T4.4

---

## Phase 5 — Student: Onboarding & Room View

The Kofa bridge and read-only room view. Implements BR-1.5, BR-5.1, BR-5.2, BR-4.1, BR-4.2.

### T5.1 — Kofa bridge endpoints ⬜

`GET /student/rooms/available` (dropdown source), `POST /student/allocation` (creates `student_room_allocations` row for the active session). Implements BR-1.5, BR-5.1, BR-5.2 (dropdown, not free text, per §3).
**Depends on:** T1.3, T2.3, T3.5, T1.7

### T5.2 — Student room view endpoint ⬜

`GET /student/room` — baseline items for the student's active allocation, split into corner/shared groups by `asset_types.sign_off_group` (§7.3). Implements BR-4.1, BR-4.2.
**Depends on:** T1.4, T5.1, T4.3

### T5.3 — Student frontend: first-login onboarding ⬜

Room/hall dropdown selection flow shown on first login, submitting to T5.1.
**Depends on:** T2.5, T5.1

### T5.4 — Student frontend: My Room page ⬜

Displays corner/shared asset groupings from T5.2 (read-only at this stage; sign-off added in Phase 6).
**Depends on:** T5.3, T5.2

---

## Phase 6 — Student: Sign-off & Dispute

Implements BR-4.3, BR-4.4, BR-4.8 through BR-4.14 (the full sign-off + dispute + shared-confirmation model).

### T6.1 — Sign-off endpoint ⬜

`POST /student/signoff` — creates an independent `sign_offs` row per (baseline, student, group); accepts `status` ('confirmed'/'contested') and an optional/required `comment`. Writes an audit log entry. Implements BR-4.3, BR-4.4, BR-4.8, BR-4.9.
**Depends on:** T1.4, T5.2, T1.7

### T6.2 — Shared Room Item confirmation logic ⬜

Derived `shared_confirmed` computation (§7.8, BR-4.12–4.13) surfaced on `GET /porter/rooms` (extend T4.1) and in baseline detail responses.
**Depends on:** T6.1, T4.1

### T6.3 — Student frontend: sign-off UI ⬜

Two independent sign-off actions (corner, shared) on the My Room page, each able to carry a dispute note. Implements BR-4.14.
**Depends on:** T5.4, T6.1

### T6.4 — Porter/Admin visibility of dispute comments ⬜

Extend `GET /porter/baselines/{id}` (built in T8.1) and the Admin audit log view (T9.4) to surface `sign_offs.comment`. Implements BR-4.10.
**Depends on:** T6.1, T8.1, T9.4
**Note:** listed here for traceability; actual implementation happens alongside T8.1/T9.4 once those exist — mark Done only when both surfaces show dispute comments.

---

## Phase 7 — Student: Condition Reports & History

Implements BR-4.5, BR-4.6.

### T7.1 — Condition report endpoint ⬜

`POST /student/condition-report` — free-text, optionally tagged to an asset type. Writes an audit log entry.
**Depends on:** T1.6, T5.1, T1.7

### T7.2 — Student history endpoint ⬜

`GET /student/history` — read-only list of the student's past sessions/allocations. Implements BR-4.6, BR-4.7 (no edit capability exists on this path by construction).
**Depends on:** T1.3, T5.1

### T7.3 — Student frontend: condition report form ⬜

Simple form submitting to T7.1, accessible from My Room page.
**Depends on:** T5.4, T7.1

### T7.4 — Student frontend: history page ⬜

Read-only list view from T7.2.
**Depends on:** T2.5, T7.2

---

## Phase 8 — Porter: Session-End Verification & Locking

The second half of the "core loop." Implements BR-3.4, BR-3.5, BR-6.3, BR-7.3.

### T8.1 — Baseline detail endpoint ⬜

`GET /porter/baselines/{id}` — items, lock status, and per-group sign-off summary (status + comment). Implements the read side of BR-4.10.
**Depends on:** T4.3, T6.1

### T8.2 — Auto-flagging algorithm ⬜

Implement the exact decision logic from `TECHNICAL_MVP.md §7.4` (missing / damaged / quantity_mismatch / ok) as a pure, unit-testable service function.
**Depends on:** T1.5

### T8.3 — Submit verification endpoint ⬜

`POST /porter/baselines/{id}/verify` — creates `session_end_verifications` + `verification_items` using T8.2's logic, and in the same transaction sets `room_inventory_baselines.locked = TRUE` (§7.5). Writes an audit log entry. Implements BR-3.4, BR-3.5.
**Depends on:** T8.2, T8.1

### T8.4 — Locking enforcement ⬜

Add the 409-on-locked guard to every baseline/sign-off mutation endpoint (T4.3 edit paths if any, T6.1) so a locked baseline can no longer be altered. Confirm `condition_reports` (T7.1) remains allowed post-lock. Implements BR-6.3.
**Depends on:** T8.3, T6.1, T7.1

### T8.5 — Porter frontend: Session-End Verification screen ⬜

Shows baseline vs. current-state entry form, submits to T8.3, and renders the returned flags (missing/damaged/quantity_mismatch) visually.
**Depends on:** T4.5, T8.1, T8.3

---

## Phase 9 — Admin: Reporting, Dashboard, Audit Trail

Implements BR-2.1, BR-2.7, BR-2.9.

### T9.1 — Admin dashboard summary endpoint ⬜

`GET /admin/dashboard/summary` — total rooms, total flagged issues (count of non-'ok' `verification_items` in the active session, per §7.4). Implements BR-2.1.
**Depends on:** T8.3, T3.1

### T9.2 — Baselines report endpoint ⬜

`GET /admin/reports/baselines` — room, session, created_by, created_at, shared_confirmed. Implements BR-2.7 (basic/unfiltered per §3).
**Depends on:** T4.3, T6.2

### T9.3 — Verifications report endpoint ⬜

`GET /admin/reports/verifications` — room, session, flagged_count, verified_at. Implements BR-2.7.
**Depends on:** T8.3

### T9.4 — Audit log endpoint ⬜

`GET /admin/audit-log` — reverse-chronological feed including dispute comments. Implements BR-2.9, BR-4.10.
**Depends on:** T1.7

### T9.5 — Admin frontend: Dashboard page ⬜

Renders T9.1's summary.
**Depends on:** T2.5, T9.1

### T9.6 — Admin frontend: Reports pages ⬜

Renders T9.2 and T9.3 as list views.
**Depends on:** T2.5, T9.2, T9.3

### T9.7 — Admin frontend: Audit trail page ⬜

Renders T9.4 as a scrollable/paginated feed.
**Depends on:** T2.5, T9.4

---

## Phase 10 — Pending-Action Indicators (Conditional Feature)

Implements BR-8.1 through BR-8.3 (explicitly marked Conditional in the BRD). Build this phase only after the entire core loop (Phases 4–8) is complete and demonstrably working end-to-end — treat that as a pass/fail gate, not a partial attempt (per `TECHNICAL_MVP.md §14` risk mitigation). If skipped or partially done, no other phase is affected; this phase only adds computed fields to existing responses.

### T10.1 — Student pending-signoff flag ⬜

Extend `GET /student/room` (T5.2) with a derived flag: pending if the active baseline is missing a corner or shared sign-off from this student (§7.10). Implements BR-8.1.
**Depends on:** T5.2, T6.1

### T10.2 — Porter pending-room flags ⬜

Extend `GET /porter/rooms` (T4.1) with derived flags: no-baseline-yet, and baseline-unlocked-pending-verification. Implements BR-8.2.
**Depends on:** T4.1, T8.3

### T10.3 — Admin pending count ⬜

Extend `GET /admin/dashboard/summary` (T9.1) with `pending_signoff_count`. Implements BR-8.3.
**Depends on:** T9.1, T6.1

### T10.4 — Frontend pending indicators ⬜

Surface the three flags above as visible badges/banners on Student My Room, Porter Assigned Rooms, and Admin Dashboard.
**Depends on:** T10.1, T10.2, T10.3, T5.4, T4.5, T9.5

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
