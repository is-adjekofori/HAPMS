# TECHNICAL REQUIREMENTS & MVP BUILD DOCUMENT

Hostel Asset and Property Management System (HAPMS)

4-Week MVP Implementation Guide

Stack: Next.js + Tailwind CSS (frontend) · FastAPI (backend) · MySQL (database)

Derived from: HAPMS Business Requirements Document v1.0

Document Version: 1.0 — July 2026

> Note: the original document sequences work into a 4-week calendar plan. Per project direction, [[TASKS]] (the working implementation guide) intentionally disregards that timeline and instead sequences by logical dependency. This file is kept as the technical source of truth for schema, API, and business-logic decisions.

## 1. Purpose and How to Use This Document

This document translates the HAPMS Business Requirements Document (BRD) into an actionable technical build plan. It intentionally covers only what must be built to deliver a working, demonstrable system. Every section is written to be handed directly to a developer: database tables are specified column-by-column, API endpoints are specified request/response field by field.

Where the BRD described a full-featured capability, this document either scopes it down for MVP or defers it entirely — see Section 3 (MVP Scope) and Section 11 (Cut List) for exactly what is deferred and why.

## 2. MVP Philosophy

The single goal of the MVP is to prove the core value of the project end-to-end: a Porter can record what is in a room, a Student can see it and sign off on it, and a Porter can later verify what changed and have the system flag it automatically. Everything else in the BRD exists to support, secure, or report on that core loop.

## 3. MVP Scope Summary

| Area | MVP Treatment |
|---|---|
| Login & roles | Full — single login, JWT-based, role redirect to Admin/Porter/Student dashboard |
| Admin: hall/room/user management | Full — this is a hard dependency for every other feature |
| Admin: dashboard summary | Full but simple — total rooms, total flagged issues, counts only |
| Admin: reports | Basic — simple list views of baselines and verifications, no filters, no export |
| Admin: audit trail | Basic — single reverse-chronological activity feed, no filters |
| Porter: baseline entry | Full — category-filtered asset form, this is core to the MVP |
| Porter: session-end verification | Full — automatic diff/flagging, this is core to the MVP |
| Student: Kofa room entry | Dropdown of Admin-created rooms (validated, linked) — not free text |
| Student: room view + sign-off | Full — corner/shared split, two independent sign-offs, this is core to the MVP |
| Student: condition report | Full but simple — free-text report, optionally tagged to one asset type |
| Student: session history | Basic — read-only list of past sessions for that student only |
| Session locking after verification | Full — this protects the integrity of the core loop's output |
| Password reset | Simplified — Admin-triggered reset only, no email delivery |
| Kofa live integration | Not built — out of scope per BRD |
| Sign-off dispute notes | Full — largely already covered by the existing sign_offs schema; see Section 7.7 |
| Shared Room Item "confirmed" display | Full — derived logic only, no new tables; see Section 7.8 |
| Session management (create/close) | Full — explicit Admin-driven create and close, with a verification-complete gate; see Section 7.9 |
| Dashboard pending-action indicators (notifications) | Conditional — built only if a checkpoint is met; see Section 7.10 |
| Photo evidence on damaged assets/condition reports | Not built — future enhancement, see Section 11 |

## 4. System Architecture

### 4.1 Overview

HAPMS uses a decoupled architecture: a Next.js frontend and a FastAPI backend communicate exclusively over a JSON REST API.

```
Browser (Next.js + Tailwind)
        |  HTTPS / JSON
        v
FastAPI backend (Python)
  - Auth & RBAC (JWT)
  - Business logic (asset rules, sign-off, flagging, locking)
        |  SQLAlchemy ORM
        v
MySQL database
```

### 4.2 Recommended Backend Layout

```
app/
  main.py            entrypoint, router registration
  core/              config, security (JWT), dependencies (get_current_user, require_role)
  models/             SQLAlchemy models (one file per table group)
  schemas/            Pydantic request/response models
  routers/            auth.py, admin.py, porter.py, student.py
  services/           business logic: asset_rules.py, flagging.py, locking.py
  seed/               seed_data.py (asset types, hall rules — see Section 9)
```

### 4.3 Recommended Frontend Layout

```
app/
  login/
  admin/  dashboard, halls, rooms, users, reports, audit-log
  porter/ rooms, rooms/[roomId]/baseline, rooms/[roomId]/verify
  student/ onboarding, room, condition-report, history
lib/   api client, auth/session helpers
components/  shared UI: AssetTable, SignOffButton, FlagBadge, RoleGuard
```

Use the Next.js App Router with a thin API client (fetch wrapper) that attaches the JWT and centralises error handling. Keep components simple — Tailwind utility classes directly in JSX is fine; do not invest time in a design system.

## 5. Authentication & Role-Based Access Control

- Login issues a JWT containing the user's id, role, and a short expiry (e.g. 8 hours). The frontend stores it in memory/cookie and attaches it as a Bearer token on every request.
- A single FastAPI dependency, e.g. `require_role("admin")`, guards every route. It decodes the JWT, loads the user, and returns 403 if the role does not match. Every Admin, Porter, and Student route in Section 8 must use this dependency.
- Passwords are stored as bcrypt hashes only, never plain text.
- Password reset for MVP: an Admin can trigger a reset for any user, which generates a new temporary password and displays it to the Admin to relay manually. No email sending is built for MVP (see Section 11).

## 6. Database Schema (MySQL)

All tables use an unsigned auto-incrementing integer primary key named `id` unless noted. All foreign keys should have an index. Timestamps are stored in UTC.

### 6.1 users

Every person who can log in: Admin, Porter, or Student.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | INT UNSIGNED | PK, AUTO_INCREMENT | |
| full_name | VARCHAR(150) | NOT NULL | |
| email | VARCHAR(150) | UNIQUE, NOT NULL | Login identifier |
| password_hash | VARCHAR(255) | NOT NULL | bcrypt hash |
| role | ENUM('admin','porter','student') | NOT NULL | |
| is_active | BOOLEAN | NOT NULL, DEFAULT TRUE | Soft-disable instead of delete |
| created_at | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP | |
| updated_at | DATETIME | NULL, ON UPDATE CURRENT_TIMESTAMP | |

### 6.2 halls

A hostel hall/building. `hall_type` is the key driver of which assets apply (Section 9).

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | INT UNSIGNED | PK, AUTO_INCREMENT | |
| name | VARCHAR(100) | UNIQUE, NOT NULL | e.g. "Hall 3", "TETFUND A", "Daisy Danjuma" |
| hall_type | ENUM('regular','tetfund_danjuma','hall_6','hall_7') | NOT NULL | Drives asset rules; category (Regular/Special) is derived: regular -> Regular, all others -> Special |
| created_at | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP | |

### 6.3 rooms

An individual room within a hall.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | INT UNSIGNED | PK, AUTO_INCREMENT | |
| hall_id | INT UNSIGNED | FK -> halls.id, NOT NULL | |
| room_number | VARCHAR(20) | NOT NULL | e.g. "12" |
| corner_label | VARCHAR(10) | NULL | Optional wing/corner descriptor; used only for Hall 7 ("A"/"B") — confirm exact meaning with stakeholder (see Section 12) |
| capacity | INT | NOT NULL | Informational occupancy count from hall_type; not enforced in MVP |
| created_at | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP | |

UNIQUE constraint on (hall_id, room_number, corner_label).

### 6.4 porter_room_assignments

Which Porter is responsible for which room.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | INT UNSIGNED | PK, AUTO_INCREMENT | |
| porter_id | INT UNSIGNED | FK -> users.id, NOT NULL | |
| room_id | INT UNSIGNED | FK -> rooms.id, NOT NULL | |
| assigned_at | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP | |

UNIQUE constraint on (porter_id, room_id).

### 6.5 asset_types

The fixed lookup list of trackable asset kinds and which sign-off group each belongs to.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | INT UNSIGNED | PK, AUTO_INCREMENT | |
| code | VARCHAR(30) | UNIQUE, NOT NULL | mattress, bunk_bed, single_bed, fan, cupboard, table, chair, window_blind |
| display_name | VARCHAR(50) | NOT NULL | e.g. "Window Blind" |
| sign_off_group | ENUM('corner','shared') | NOT NULL | corner = mattress, table, chair; shared = bunk_bed, single_bed, fan, cupboard, window_blind |

### 6.6 hall_asset_rules

Which asset types (and default quantities) apply to each hall_type — encodes the Section 9 breakdown table. Drives the Baseline Entry Form.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | INT UNSIGNED | PK, AUTO_INCREMENT | |
| hall_type | ENUM('regular','tetfund_danjuma','hall_6','hall_7') | NOT NULL | |
| asset_type_id | INT UNSIGNED | FK -> asset_types.id, NOT NULL | |
| default_quantity | INT | NOT NULL | Pre-filled suggestion; Porter can override per room |
| notes | VARCHAR(255) | NULL | e.g. "shared 2 people to 1 cupboard", "count pending confirmation" |

UNIQUE constraint on (hall_type, asset_type_id). Seed data is specified in Section 9 and must be loaded before any other feature can be tested.

### 6.7 sessions

An academic hostel session (e.g. "2025/2026"), created and closed explicitly by the Administrator (Section 7.9). Exactly one session with status='active' at a time; enforced in application logic, not the database.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | INT UNSIGNED | PK, AUTO_INCREMENT | |
| name | VARCHAR(100) | UNIQUE, NOT NULL | e.g. "2025/2026" |
| status | ENUM('active','closed') | NOT NULL, DEFAULT 'active' | |
| started_at | DATETIME | NOT NULL | |
| closed_at | DATETIME | NULL | |

### 6.8 student_room_allocations

The Kofa bridge: links a Student to a Room for a Session, chosen from a dropdown of Admin-created rooms.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | INT UNSIGNED | PK, AUTO_INCREMENT | |
| student_id | INT UNSIGNED | FK -> users.id, NOT NULL | |
| room_id | INT UNSIGNED | FK -> rooms.id, NOT NULL | Selected from dropdown, not free text |
| session_id | INT UNSIGNED | FK -> sessions.id, NOT NULL | |
| allocated_at | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP | |
| status | ENUM('active','vacated') | NOT NULL, DEFAULT 'active' | |

UNIQUE constraint on (student_id, session_id) — one room per student per session.

### 6.9 room_inventory_baselines

The Porter's baseline record for a room in a session — the anchor for sign-offs and later verification.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | INT UNSIGNED | PK, AUTO_INCREMENT | |
| room_id | INT UNSIGNED | FK -> rooms.id, NOT NULL | |
| session_id | INT UNSIGNED | FK -> sessions.id, NOT NULL | |
| created_by | INT UNSIGNED | FK -> users.id, NOT NULL | Must be a Porter assigned to this room |
| created_at | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP | |
| locked | BOOLEAN | NOT NULL, DEFAULT FALSE | Set TRUE automatically once Session-End Verification is submitted (Section 7) |

UNIQUE constraint on (room_id, session_id) — this is also what prevents a second baseline being opened for a room while its current session is still unclosed (Section 7.9); the API should turn a violation of this constraint into a clear 409 error rather than a raw database exception.

### 6.10 baseline_items

Line items of a baseline — one row per asset type present in the room at check-in.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | INT UNSIGNED | PK, AUTO_INCREMENT | |
| baseline_id | INT UNSIGNED | FK -> room_inventory_baselines.id, NOT NULL | |
| asset_type_id | INT UNSIGNED | FK -> asset_types.id, NOT NULL | Must be valid for the room's hall_type |
| quantity | INT | NOT NULL | |
| condition | ENUM('good','fair','damaged') | NOT NULL, DEFAULT 'good' | |
| notes | VARCHAR(255) | NULL | |

UNIQUE constraint on (baseline_id, asset_type_id).

### 6.11 sign_offs

The Student's digital signature — one row per (baseline, student, group), so corner and shared are independent. The comment field doubles as the dispute note (Section 7.7): a 'contested' status with a comment is still a valid, final sign-off, not a rejection.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | INT UNSIGNED | PK, AUTO_INCREMENT | |
| baseline_id | INT UNSIGNED | FK -> room_inventory_baselines.id, NOT NULL | |
| student_id | INT UNSIGNED | FK -> users.id, NOT NULL | |
| sign_off_group | ENUM('corner','shared') | NOT NULL | |
| status | ENUM('confirmed','contested') | NOT NULL | |
| comment | VARCHAR(500) | NULL | Required if status = 'contested' |
| signed_at | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP | |

UNIQUE constraint on (baseline_id, student_id, sign_off_group).

### 6.12 condition_reports

Optional student-submitted report of a change during the session.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | INT UNSIGNED | PK, AUTO_INCREMENT | |
| allocation_id | INT UNSIGNED | FK -> student_room_allocations.id, NOT NULL | |
| asset_type_id | INT UNSIGNED | FK -> asset_types.id, NULL | Optional — report may be general |
| description | TEXT | NOT NULL | e.g. "the fan stopped working in March" |
| reported_at | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP | |
| status | ENUM('open','acknowledged') | NOT NULL, DEFAULT 'open' | |

### 6.13 session_end_verifications

The Porter's end-of-session audit for one baseline (1:1 with room_inventory_baselines).

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | INT UNSIGNED | PK, AUTO_INCREMENT | |
| baseline_id | INT UNSIGNED | FK -> room_inventory_baselines.id, UNIQUE, NOT NULL | |
| verified_by | INT UNSIGNED | FK -> users.id, NOT NULL | Must be a Porter assigned to this room |
| verified_at | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP | |

### 6.14 verification_items

Line items comparing current room state against each baseline_item, with a system-computed flag.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | INT UNSIGNED | PK, AUTO_INCREMENT | |
| verification_id | INT UNSIGNED | FK -> session_end_verifications.id, NOT NULL | |
| baseline_item_id | INT UNSIGNED | FK -> baseline_items.id, NOT NULL | |
| current_quantity | INT | NOT NULL | |
| current_condition | ENUM('good','fair','damaged','missing') | NOT NULL | |
| flag | ENUM('ok','missing','damaged','quantity_mismatch') | NOT NULL, DEFAULT 'ok' | System-computed — see Section 7 |
| notes | VARCHAR(255) | NULL | |

UNIQUE constraint on (verification_id, baseline_item_id).

### 6.15 audit_logs

A simple, unfiltered activity feed for the Admin (per MVP scope decision).

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | INT UNSIGNED | PK, AUTO_INCREMENT | |
| user_id | INT UNSIGNED | FK -> users.id, NULL | |
| action | VARCHAR(100) | NOT NULL | e.g. CREATE_ROOM, CREATE_BASELINE, SIGN_OFF, VERIFY_SESSION |
| entity_type | VARCHAR(50) | NOT NULL | e.g. "room_inventory_baseline" |
| entity_id | INT UNSIGNED | NULL | |
| description | VARCHAR(255) | NULL | Human-readable summary line |
| created_at | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Index this column |

## 7. Core Business Logic

### 7.1 Asset-Type Filtering by Hall Category

When a Porter opens the Baseline Entry Form for a room, the backend looks up the room's `hall.hall_type`, queries `hall_asset_rules` for that hall_type, and returns only those asset types (with default_quantity pre-filled). The Porter can adjust quantity and condition but cannot add an asset type outside that list.

### 7.2 Chair-to-Table Matching

Per the BRD, chair count should match table count. Implement this as a UI convenience: when the Porter sets the table quantity, default the chair quantity to the same value. The Porter may still override it before saving.

### 7.3 Corner vs. Shared Sign-off

The Student's room view groups baseline_items by `asset_types.sign_off_group`. Two independent `sign_offs` rows are created for a given baseline and student — one for 'corner', one for 'shared'. The UI must show each group's sign-off state separately and never let one action confirm both.

### 7.4 Session-End Auto-Flagging Algorithm

For each baseline_item in the room's baseline, the Porter enters the current quantity and condition during Session-End Verification. The backend computes the flag as follows:

```
if current_condition == 'missing':
    flag = 'missing'
elif current_condition == 'damaged' and baseline_item.condition != 'damaged':
    flag = 'damaged'
elif current_quantity < baseline_item.quantity:
    flag = 'quantity_mismatch'
else:
    flag = 'ok'
```

The Admin dashboard's "flagged asset problems" count (Section 3) is simply the count of verification_items where flag != 'ok' across the active session.

### 7.5 Locking

Submitting `POST /porter/baselines/{id}/verify` creates the `session_end_verifications` row and, in the same transaction, sets `room_inventory_baselines.locked = TRUE`. Once locked, the API must reject (409 Conflict) any further attempt to edit baseline_items or create/modify sign_offs for that baseline. A new `condition_reports` entry is still allowed at any time, since it is a separate, additive record rather than an edit.

### 7.6 Role-Based Data Scoping

- A Porter's room list is always filtered to rooms present in `porter_room_assignments` for that `porter_id`.
- A Student's room view is always filtered to their own `student_room_allocations` row for the active session — never another student's.
- An Admin has unrestricted read access across all halls, rooms, and sessions.

### 7.7 Dispute Notes on Sign-off

This is almost entirely covered by the schema already: `sign_offs.status` already supports 'contested', and the comment field already exists (Section 6.11). Two things must be true in the implementation:

- A 'contested' sign-off is written and treated exactly like a 'confirmed' one for every workflow purpose (locking, verification, session closing) — the only difference is the status value and the attached comment. Nothing in the system should branch on 'contested' to block progress.
- `GET /porter/baselines/{id}` and the Admin audit log must surface the `sign_offs.comment` text, not just the status, so a dispute is actually visible to the Porter and Administrator (Section 8.3, 8.2).

### 7.8 Shared Room Item "First Valid Confirmation" Display

A room's Shared Room Items grouping is considered confirmed as soon as any single `sign_offs` row exists for that `baseline_id` with `sign_off_group = 'shared'`, regardless of status ('confirmed' or 'contested' both count — both are valid, final sign-offs per Section 7.7). This is a read-only, derived status for display only:

```
shared_confirmed = exists(
    sign_offs WHERE baseline_id = X
    AND sign_off_group = 'shared'
)  # status doesn't matter — any row at all counts
```

- This does not gate or block anything — the Porter's Session-End Verification proceeds regardless of how many occupants have signed off on shared items.
- Corner-level confirmation is never derived this way — it is always evaluated per individual student, since each student is responsible only for their own corner sign-off.
- Surface `shared_confirmed` on `GET /porter/rooms` (per room) and in the Admin baseline report (Section 8.2, 8.3) so both oversight roles can see it without a dedicated resolution screen.

### 7.9 Session Lifecycle

Sessions are created and closed only by the Administrator, and every Porter/Student action is associated with the currently active session automatically — no manual session selection is ever shown to a Porter or Student.

- `POST /admin/sessions` creates a new session with status='active'. It does not automatically close any other session — closing is a separate, explicit action (see below), so an Admin cannot accidentally lock out an in-progress session by opening a new one.
- `PATCH /admin/sessions/{id}/close` is only permitted if every `room_inventory_baselines` row for that session has `locked = TRUE` (i.e. every room under that session has completed Session-End Verification). If any room has not, the API rejects the request and returns the list of unverified rooms so the Admin knows what is outstanding.
- Creating a baseline for a room that already has an unlocked baseline in the currently active session is rejected with a 409 Conflict and a clear message ("This room already has an open baseline for the current session") — enforced by the UNIQUE(room_id, session_id) constraint on room_inventory_baselines (Section 6.9), surfaced as a friendly error rather than a raw database exception.

### 7.10 Pending-Action Indicators (Conditional)

If built, pending status requires no new tables — it is derived by checking for the absence of an expected row:

- A Student has a pending Check-in Slip if their active allocation's baseline exists but is missing a `sign_offs` row for either 'corner' or 'shared' for that student.
- A Porter has a pending room if an assigned room has no baseline yet for the active session, or has a baseline that is not yet locked once the session is due to close.
- The Admin dashboard's pending count (BR-8.3) is the count of rooms in the active session without a complete pair of sign_offs across all their current occupants' corner groups.

This logic only ever adds a computed field to existing GET responses (`GET /student/room`, `GET /porter/rooms`, `GET /admin/dashboard/summary`) — it does not require new endpoints or schema.

## 8. API Endpoint Specification

All endpoints are prefixed with `/api`. All (except `/auth/login`) require a valid Bearer JWT; the Role column indicates which role(s) may call it.

### 8.1 Auth

| Method & Path | Role | Request | Response |
|---|---|---|---|
| POST /auth/login | Any | email, password | access_token, role, full_name |
| POST /auth/reset-password/{user_id} | Admin | — | temporary_password (shown once) |

### 8.2 Admin

| Method & Path | Role | Request | Response |
|---|---|---|---|
| POST /admin/users | Admin | full_name, email, role | user record |
| GET /admin/users | Admin | — | list of users |
| PATCH /admin/users/{id}/deactivate | Admin | — | updated user |
| GET /admin/halls | Admin | — | list of halls (fixed set, seeded by `app.seed.halls` — no create endpoint) |
| POST /admin/rooms | Admin | hall_id, room_number, corner_label? | room record |
| GET /admin/rooms | Admin | — | list of rooms |
| POST /admin/porter-assignments | Admin | porter_id, room_id | assignment record |
| GET /admin/dashboard/summary | Admin | — | total_rooms, total_flagged_issues, pending_signoff_count (conditional, Section 7.10) |
| GET /admin/reports/baselines | Admin | — | simple list: room, session, created_by, created_at, shared_confirmed |
| GET /admin/reports/verifications | Admin | — | simple list: room, session, flagged_count, verified_at |
| GET /admin/audit-log | Admin | — | reverse-chronological list, most recent first, including sign-off dispute comments |
| POST /admin/sessions | Admin | name, started_at | session record, status='active' — does NOT close any other session (Section 7.9) |
| PATCH /admin/sessions/{id}/close | Admin | — | closed session record, or 409 + list of unverified rooms if any baseline is still unlocked |
| GET /admin/sessions | Admin | — | list of sessions with status (open/closed) |

### 8.3 Porter

| Method & Path | Role | Request | Response |
|---|---|---|---|
| GET /porter/rooms | Porter | — | assigned rooms only, with shared_confirmed and pending flags (Section 7.8, 7.10) |
| GET /porter/rooms/{room_id}/asset-types | Porter | — | valid asset types + default quantities for this room |
| POST /porter/rooms/{room_id}/baseline | Porter | items: [{asset_type_id, quantity, condition}] | baseline record + items, or 409 if room already has an open baseline this session (Section 7.9) |
| GET /porter/baselines/{id} | Porter | — | baseline + items + lock status + sign-off summary per group (status, dispute comment if any) |
| POST /porter/baselines/{id}/verify | Porter | items: [{baseline_item_id, current_quantity, current_condition}] | verification record + computed flags |

### 8.4 Student

| Method & Path | Role | Request | Response |
|---|---|---|---|
| GET /student/rooms/available | Student | — | list of halls/rooms for the onboarding dropdown |
| POST /student/allocation | Student | room_id | allocation record (active session) |
| GET /student/room | Student | — | baseline items split into corner / shared, sign-off state, pending flag (conditional, Section 7.10) |
| POST /student/signoff | Student | baseline_id, sign_off_group, status ('confirmed'/'contested'), comment? (required if contested) | sign_off record — valid and final either way (Section 7.7) |
| POST /student/condition-report | Student | description, asset_type_id? | condition_report record |
| GET /student/history | Student | — | read-only list of past sessions for this student |

### 8.5 Example Payloads

`POST /porter/rooms/12/baseline` — request:

```json
{
  "items": [
    { "asset_type_id": 2, "quantity": 2, "condition": "good" },
    { "asset_type_id": 1, "quantity": 4, "condition": "good" },
    { "asset_type_id": 8, "quantity": 1, "condition": "fair" }
  ]
}
```

`POST /porter/baselines/45/verify` — response:

```json
{
  "verification_id": 9,
  "verified_at": "2026-11-20T10:15:00Z",
  "items": [
    { "baseline_item_id": 101, "flag": "ok" },
    { "baseline_item_id": 102, "flag": "missing" },
    { "baseline_item_id": 103, "flag": "quantity_mismatch" }
  ]
}
```

## 9. Required Seed Data

This data must exist before any other feature can be built or tested — load it via a seed script early.

### 9.1 asset_types

| code | display_name | sign_off_group |
|---|---|---|
| mattress | Mattress | corner |
| table | Table | corner |
| chair | Chair | corner |
| bunk_bed | Bunk Bed | shared |
| single_bed | Single Bed | shared |
| fan | Fan | shared |
| cupboard | Cupboard | shared |
| window_blind | Window Blind | shared |

### 9.2 hall_asset_rules

| hall_type | asset_type | default_quantity | notes |
|---|---|---|---|
| regular | bunk_bed | 4 | Halls 1–4 |
| regular | fan | 1 | |
| regular | cupboard | 4 | shared 2 people to 1 cupboard |
| tetfund_danjuma | bunk_bed | 2 | TETFUND A–D, Daisy Danjuma |
| tetfund_danjuma | mattress | 4 | |
| tetfund_danjuma | table | 1 | at least 1; Porter may increase |
| tetfund_danjuma | chair | 1 | auto-matches table quantity |
| tetfund_danjuma | window_blind | 1 | |
| tetfund_danjuma | cupboard | 2 | PLACEHOLDER — count unconfirmed, see Section 12 |
| hall_6 | bunk_bed | 2 | |
| hall_6 | mattress | 4 | |
| hall_6 | table | 4 | up to 4; Porter may reduce |
| hall_6 | chair | 4 | auto-matches table quantity |
| hall_6 | window_blind | 1 | |
| hall_6 | cupboard | 4 | 1 per person |
| hall_7 | single_bed | 2 | no upper bunk |
| hall_7 | mattress | 2 | |
| hall_7 | table | 1 | at least 1 |
| hall_7 | chair | 1 | auto-matches table quantity |
| hall_7 | window_blind | 1 | |
| hall_7 | cupboard | 1 | |

## 10. Original Build Plan (superseded by [[TASKS]])

The original document sequenced work into a 4-week calendar plan (Week 1: foundations; Week 2: baseline + Kofa dropdown; Week 3: sign-off + verification; Week 4: admin views, testing, presentation readiness), with a Week 3 checkpoint gating whether pending-action indicators (Section 7.10) were attempted. Per project direction, timelines are disregarded in favor of dependency-ordered tasks — see `TASKS.md` for the actual execution plan. The content of each original week is preserved in Section 11 (Cut List) and Section 13 (Testing) below, and fully reflected in TASKS.md.

## 11. Explicitly Deferred Beyond MVP

These items are described in the BRD but are deliberately not built in the initial implementation. This is intentional scoping, not a shortfall.

- Live/API integration with Kofa — remains manual dropdown entry (per BRD, out of scope regardless of timeline).
- Self-service, email-based password reset — replaced with Admin-triggered manual reset.
- Filterable and exportable Admin reports — replaced with simple, unfiltered list views.
- Filterable audit trail — replaced with a single reverse-chronological activity feed.
- Room occupancy capacity enforcement — capacity is stored for information only, not enforced.
- Any dispute-resolution workflow beyond recording a sign-off as 'contested' — no dedicated resolution screen is built; a dispute note is a permanent record, not an open ticket.
- Multi-session historical analytics or trend dashboards for Admin.
- Photo evidence on damaged assets or condition reports — documented in the BRD as a Could Have future enhancement, not built in this phase.
- Dashboard pending-action indicators (Section 7.10) — conditional; if not completed, users can determine pending actions by opening the relevant page directly.

## 12. Assumptions and Open Decisions

These decisions were made to keep the schema and scope buildable. Confirm each with the project stakeholder as soon as possible, and adjust the seed data or schema if any turns out to be wrong.

- Only one session is 'active' at a time. Opening a new session does NOT automatically close the previous one — closing is a separate, explicit Admin action gated on every room in that session having completed verification (Section 7.9).
- A 'contested' sign-off is treated identically to a 'confirmed' one for every workflow purpose (Section 7.7); the difference is purely the status label and the attached dispute comment.
- Shared Room Item confirmation only ever requires one occupant's sign-off, of either status; this is a display convenience and never blocks Session-End Verification (Section 7.8).
- The BRD's binary Regular/Special room category is implemented as four underlying hall_type values (regular, tetfund_danjuma, hall_6, hall_7) so the correct asset rules can be applied; category is derived from hall_type, not stored separately.
- The Hall 7 "Corner A / Corner B" reference is treated as an optional descriptive label on the room record. Its exact meaning (a wing/block name vs. something else) should be confirmed with hostel administration.
- The cupboard count for TETFUND A–D and Daisy Danjuma Hostel is seeded as a placeholder (2) pending confirmation — flagged in Section 9.2.
- Chair quantity is auto-suggested to match table quantity but remains editable by the Porter.
- Room occupancy capacity is descriptive only and is not enforced against the number of allocations in the MVP.

## 13. Testing & Acceptance Plan

These are the manual test cases to run before considering the project complete, drawn directly from the BRD's success criteria.

- Admin can create a hall with a hall_type, add a room to it, and the room's Baseline Entry Form only offers asset types valid for that hall_type.
- A Porter only ever sees rooms assigned to them — never another Porter's rooms.
- A Porter can complete a baseline and the record is correctly attributed and timestamped.
- A Student can select their room from the dropdown, view assets split into corner/shared, and sign off on each independently.
- A Student cannot view or act on another student's room under any circumstance.
- A Student can submit a condition report and it appears against their allocation.
- A Porter's Session-End Verification correctly flags a deliberately-introduced discrepancy (missing item, damaged item, and quantity mismatch — test all three).
- Once verification is submitted, further attempts to edit that baseline or its sign-offs are rejected.
- The Admin dashboard's flagged-issue count matches the actual number of non-'ok' verification_items in the active session.
- The Admin audit log shows every action taken during the above tests, in the correct order, correctly attributed.
- A Student can sign off with status 'contested' and a comment; the session is not blocked, and the comment is visible on the Porter's baseline view and the Admin audit log.
- Once any one occupant of a shared room signs off on Shared Room Items (confirmed or contested), shared_confirmed shows true for that room, while each occupant's own corner sign-off remains tracked and required individually.
- Attempting to create a second baseline for a room that already has an open, unlocked baseline in the active session is rejected with a clear error, not a raw database exception.
- Attempting to close a session with at least one unverified room is rejected and lists the outstanding room(s); closing succeeds once every room in that session is verified.
- If pending-action indicators were built: a Student with an unsigned baseline sees a pending indicator on login, and it disappears once both sign-offs are submitted.

## 14. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| The hall_type/asset-rule matrix (Section 9) is wrong or incomplete when discovered late. | Confirm the TETFUND/Danjuma cupboard count and Hall 7 corner meaning early, before other features depend on the seed data. |
| Next.js + FastAPI integration friction (CORS, auth headers, deployment) eats early time. | Get a trivial authenticated round-trip (login -> protected 'hello' endpoint) working early, before building real features on top. |
| Testing gets compressed into the final stretch before presentation. | Run the Section 13 test list incrementally as each phase completes, not only at the end. |
| Scope creep back toward the full BRD feature set under time pressure. | Treat Section 11 (Cut List) as a standing decision; any addition must be traded against removing something else. |
| Pending-action indicators (Section 7.10) are started but not finished, eating into testing time. | Treat completion of the core loop as a pass/fail gate; if any part of the core loop is incomplete or buggy, the pending-indicator feature moves straight to the Cut List — no partial attempt. |
