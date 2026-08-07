# HAPMS — Frontend Pages & Use Cases

A complete catalog of every screen in the HAPMS frontend, written for UI/template design purposes.
For each page: its route, who can see it, the user story it serves, the data it shows, every action
a user can take, and every distinct state the screen can be in (loading, empty, error, success,
edge cases) — since each state is effectively its own design frame.

See `docs/BRD.md` and `docs/TECHNICAL_MVP.md` for the full functional requirements this UI implements,
and `docs/TASKS.md` for build history. This document only describes the frontend as it exists today.

---

## 1. Product context

**What it is:** A web app for recording, signing off on, and verifying hostel room assets (mattresses,
furniture, etc.) across academic sessions at a university hostel.

**Three roles, one shared shell pattern, three very different jobs-to-be-done:**

| Role | Who | Core job |
| --- | --- | --- |
| **Administrator** | Hostel management staff | Configure halls/rooms/users/sessions; monitor the whole system via dashboard, reports, and an audit trail |
| **Porter** | Hostel porters | Record each assigned room's starting inventory ("baseline") at check-in, and re-verify it at session end |
| **Student** | Hostel residents | Confirm what's in their room (or dispute it), report condition changes during their stay |

**The core loop every hostel session goes through** (this is the backbone of almost every use case
below): Admin opens a session → Porter records a room's baseline → Student views it and signs off (or
disputes with a comment) → Porter re-verifies at session end and the system auto-flags any
discrepancy → Admin reports on and audits the whole session, then closes it.

**Current design-system status** (relevant for template work): The **Administrator** section (8 pages)
was redesigned with shadcn/ui — a persistent sidebar, cards, dialogs, tables, toasts — using a
UNIBEN-branded purple/gold palette. The **Porter** and **Student** sections (6 pages) are still on the
original plain-Tailwind styling (flat top-nav, inline forms, no component library) and are the primary
candidates for new template design work. This is called out per-page below.

---

## 2. Global / cross-cutting patterns

These apply across every page and are worth designing once as reusable primitives:

- **Auth guard behavior:** Every page except `/`, `/login` requires a valid, non-expired session
  (JWT decoded client-side). No session → redirect to `/login`. Wrong role for the page → redirect to
  that user's own dashboard (`/admin`, `/porter`, or `/student`). This redirect is instant and renders
  nothing in between (no flash of wrong content) — worth a brief "checking session…" design state.
- **Loading state:** Nearly every data-driven view fetches on mount and shows a lightweight
  "Loading…" text or (on the redesigned Admin pages) skeleton placeholders shaped like the eventual
  content (skeleton table rows, skeleton stat cards).
- **Error state:** API failures surface as a plain error message inline (red text) near where the
  content would be — never a full-page crash. Network-unreachable and a structured API error message
  both funnel through the same display.
- **Empty state:** Every list explicitly handles "zero rows" with a plain sentence (e.g. "No halls
  yet.", "You have no past room allocations yet.") rather than an empty table.
- **Logout:** Available from the shell on every authenticated page; clears the token and returns to
  `/login`.
- **Toasts vs. inline errors (Admin only, redesigned pages):** Success feedback (create/update/delete)
  uses a toast notification. Validation and load errors stay inline near the form/table. Persistent,
  must-not-miss information (a one-time temporary password, a destructive-action confirmation) uses a
  dismissable banner or a confirm dialog instead of a toast.
- **Destructive actions (Admin only, redesigned pages):** Deactivating a user and closing a session
  both require an explicit confirm step (an alert dialog) before the request fires.

---

## 3. Public / unauthenticated pages

### 3.1 Landing page — `/`

- **Access:** Public, unauthenticated.
- **User story:** *As anyone arriving at the site, I want to immediately understand what this is and
  find my way to sign in.*
- **Content:** App name ("HAPMS"), a one-line description ("Hostel Asset and Property Management
  System"), a single "Sign in" call to action.
- **States:** Static — no data fetching, no variants.
- **Design note:** Currently a bare centered placeholder. A real template pass could add a short
  value-prop, the university's branding, maybe an illustration — but it's intentionally minimal today
  since it's not a marketing site.

### 3.2 Login — `/login`

- **Access:** Public, unauthenticated.
- **User story:** *As an Admin/Porter/Student, I want to sign in with the email and password I was
  given, and land on the dashboard for my role, without needing to know or choose my role myself.*
- **Content:** Centered card with email field, password field, submit button.
- **Actions:** Submit credentials → on success, stores the JWT and redirects to the role-appropriate
  dashboard (role comes from the token, not chosen by the user).
- **States:**
  - Default (empty form).
  - Submitting (button reads "Signing in…", disabled).
  - Error — invalid credentials or unreachable server (inline red text below the fields; the message
    is intentionally generic for bad credentials — no "email not found" vs. "wrong password"
    distinction, to avoid leaking which is wrong).
- **Design note:** No "forgot password" flow exists — password resets are Admin-initiated only (see
  Users page). No self-registration for any role.

---

## 4. Administrator pages (8) — *already redesigned, shadcn/ui reference*

All 8 share a common shell: a fixed dark-purple sidebar (gold active-state highlight, app logo mark,
role label, logout) on the left, with nav links to all 8 pages, and a topbar showing the current page
title. Content area uses cards, tables, dialogs.

### 4.1 Dashboard — `/admin`

- **User story:** *As an Admin, I want an at-a-glance summary of the system's health the moment I log
  in, so I know whether anything needs my attention today.*
- **Content:** Three stat cards in a row:
  1. **Total rooms** (neutral icon)
  2. **Flagged asset problems** — count of non-OK verification results in the currently active
     session (warning icon, amber when > 0)
  3. **Pending sign-offs** — count of rooms with at least one occupant who hasn't completed both
     sign-offs yet (warning icon, amber when > 0)
- **States:** Skeleton cards while loading; inline error if the summary fails to load; the three
  numbers once loaded (0 is a valid, normal value — not an error state).

### 4.2 Halls — `/admin/halls`

- **User story:** *As an Admin, I want to register each physical hostel hall and its type, so the
  system knows which asset rules and room categories apply to rooms inside it.*
- **Content:** Card with a table (Name, Hall type, Category badge) + an "Add hall" button that opens a
  dialog.
- **Create-hall dialog fields:** Name (text), Hall type (select: Regular Halls 1–4 / TETFUND A–D
  & Daisy Danjuma / Hall 6 / Hall 7). Category (Regular vs. Special) is *derived automatically* from
  hall type, not entered — shown only in the resulting table row as a badge.
- **States:** Skeleton table while loading; "No halls yet." empty state; table of halls; dialog
  open/closed; dialog form validation error (e.g. duplicate name) shown inline in the dialog; success
  toast + dialog auto-closes + table refreshes.

### 4.3 Rooms — `/admin/rooms`

- **User story:** *As an Admin, I want to add individual rooms to a hall, so Porters and Students can
  be scoped to a specific physical room.*
- **Content:** Card with a table (Hall, Room number, Corner label, Capacity) + "Add room" dialog.
- **Create-room dialog fields:** Hall (select, populated from Halls), Room number (text), Corner label
  (text, optional — only meaningful for Hall 7's A/B corners). Capacity is *derived automatically*
  from the hall's type, not entered.
- **States:** Same pattern as Halls — skeleton, empty, populated table, dialog states, validation
  errors (e.g. duplicate room number+corner in that hall), success toast.

### 4.4 Users — `/admin/users`

- **User story:** *As an Admin, I want to create Porter and Student accounts, reset a forgotten
  password, and deactivate accounts that should lose access — all without any self-registration flow
  existing.*
- **Content:** Card with a table (Name, Email, Role, Status badge, row actions) + "Add user" dialog.
  A dismissable amber banner appears above the table whenever a temporary password needs to be relayed
  (see below).
- **Create-user dialog fields:** Full name, Email, Role (Porter or Student only — Admin accounts are
  provisioned outside this UI).
- **Row actions:** "Reset password" (any user) — "Deactivate" (active, non-admin users only, behind a
  confirm dialog since it's destructive/hard to reverse).
- **The one-time-password pattern (important for design):** Both creating a user and resetting a
  password return a plaintext temporary password *exactly once*. It's shown in a persistent, manually
  dismissable banner (not a toast, since a toast would auto-vanish before the Admin can copy it) with
  the password in a monospace/code style for easy reading.
- **States:** Skeleton table; empty state; populated table; credential banner shown/dismissed; confirm
  dialog for deactivation; per-row "busy" state (buttons disabled) while an action is in flight.

### 4.5 Porter Assignments — `/admin/porter-assignments`

- **User story:** *As an Admin, I want to assign one or more rooms to a Porter, so that Porter can see
  and act on exactly those rooms (and no others).*
- **Content:** Single card, no table — a form: Porter (select, active porters only), Rooms (a
  scrollable checklist of every room, multi-select via checkboxes, with a live "N selected" count).
- **Actions:** "Assign rooms" submits one request per selected room (the API is single-room-at-a-time),
  then shows a per-room results list (✓ success / ✗ failure with the specific error, e.g. "already
  assigned to this porter").
- **States:** Empty guidance text if there are no active porters yet or no rooms yet (pointing to the
  Users/Rooms pages first); selection count; submitting; results list; success toast summarizing how
  many rooms were assigned.

### 4.6 Sessions — `/admin/sessions`

- **User story:** *As an Admin, I want to open a new hostel session and, at the end of it, close it —
  but only once every room has been verified, so nothing gets silently skipped.*
- **Content:** Card with a table (Name, Status badge [Active/Closed], Started, Closed, row action) +
  "Start session" dialog.
- **Create-session dialog fields:** Name (text, e.g. "2025/2026"), Start date & time (datetime
  picker). Blocked with a clear error if a session is already active — only one session can be active
  at a time.
- **Row action:** "Close" (active sessions only), behind a confirm dialog explaining the verification
  gate before the request fires.
- **The close-gate error (important for design):** If any room's baseline isn't yet verified, closing
  is rejected and the specific outstanding room IDs are listed in a persistent destructive-style alert
  banner at the top of the page (not a toast — the Admin needs to act on this list, not just glance at
  it).
- **States:** Skeleton table; empty state; populated table; dialog states; close-blocked alert with
  room-ID list; success toast on close.

### 4.7 Reports — `/admin/reports`

- **User story:** *As an Admin, I want to review every baseline and every verification ever recorded,
  to audit what happened across sessions.*
- **Content:** Single card containing a two-tab interface:
  - **Baselines tab:** table of Room, Session, Recorded by, Created (timestamp), Shared confirmed
    (Yes/No badge).
  - **Verifications tab:** table of Room, Session, Flagged items (badge, styled differently when > 0),
    Verified (timestamp).
- **States:** Each tab independently has its own skeleton/empty/error/populated states (they load
  separately). Not filterable or exportable in the current build (that's explicitly a documented
  future enhancement, not missing by accident).

### 4.8 Audit Log — `/admin/audit-log`

- **User story:** *As an Admin, I want a chronological, attributable record of every action taken in
  the system — including dispute comments — for accountability.*
- **Content:** Single card, table (When, Who, What [description, including embedded dispute comment
  text when relevant], Action [a monospace badge like `CREATE_BASELINE`, `VERIFY_SESSION`]).
- **Actions:** "Load more" button at the bottom, paginating 50 rows at a time (cursor is just row
  offset).
- **States:** Skeleton table on first load; empty state ("No activity recorded yet."); populated
  table; "Load more" in a loading sub-state; naturally ends when a page returns fewer than 50 rows (no
  more button shown).

---

## 5. Porter pages (3) — *pre-redesign styling, candidate for new template*

Currently share a plain shell: a flat header bar with page title + logout link, no sidebar, no
component library — inline `<table>`/`<form>`/`<button>` elements styled with raw Tailwind utility
classes.

### 5.1 My Assigned Rooms (Porter dashboard) — `/porter`

- **User story:** *As a Porter, I want to see only the rooms assigned to me, and know at a glance
  which ones need a baseline recorded vs. which need session-end verification vs. which are done.*
- **Content:** Table: Hall, Room, Corner, Capacity, Baseline status, Action link. Status is one of:
  **Not recorded** (no baseline yet this session) / **Recorded** (baseline exists, unlocked, session
  not yet ended) / **Pending verification** (distinct case worth its own visual treatment) / **Locked**
  (verified, done).
- **Actions:** Per row, exactly one contextual link: "Record baseline" (→ 5.2) if none exists yet, or
  "Verify & lock" (→ 5.3) if one exists and isn't locked, or nothing actionable once locked.
- **States:** Loading; empty ("You have no rooms assigned yet. Ask the Administrator to assign you
  rooms.") — this is a real, expected state for a brand-new Porter account; populated table with mixed
  per-row statuses (this is the common case and worth designing with 3–4 rows in different states
  simultaneously).

### 5.2 Record Room Baseline — `/porter/rooms/[roomId]/baseline`

- **User story:** *As a Porter, I want to log a room's starting inventory — what's in it, how many,
  and what condition — restricted to only the asset types valid for that room's hall type, so the
  record is accurate and I can't accidentally log something that doesn't belong there.*
- **Content:** A back link to the dashboard, then a form: two grouped sections ("Corner items",
  "Shared items"), each a list of rows (Asset name + optional notes, Quantity number input, Condition
  select: good/fair/damaged). Quantities are pre-filled with sensible defaults.
- **A specific interaction worth designing (chair-to-table auto-match):** Changing the Table quantity
  automatically updates the Chair quantity to match (common real-world pattern — chairs come with
  tables), but the Chair field remains independently editable afterward if the Porter wants to
  override it.
- **Actions:** "Save baseline" → on success, returns to the dashboard (5.1).
- **States:** Loading (fetching the valid asset-type list for this room); form populated with
  corner/shared groups; per-row quantity/condition edits; submit error (e.g. duplicate baseline already
  exists — a real 409 case since two porters or double-clicks could race); submitting/disabled button.

### 5.3 Session-End Verification — `/porter/rooms/[roomId]/verify`

- **User story:** *As a Porter, at the end of a session, I want to record the room's current
  state against the original baseline and have the system automatically tell me what's different —
  missing items, damaged items, or wrong quantities — so nothing has to be manually cross-checked.*
- **Content:** A back link, then either:
  - **The form:** one row per baseline item, showing the *original* baseline quantity/condition as
    reference text, with editable "current quantity" and "current condition" (good/fair/damaged/
    **missing** — a 4th option not available at baseline time) inputs alongside.
  - **The result (after submit):** a locked-in results table — Asset, Qty, Condition, **Flag** — where
    Flag is one of four states, each meant to be visually distinct: **OK** (green), **Missing** (red),
    **Damaged** (orange), **Quantity mismatch** (amber). This flag table is arguably the single most
    important visual moment in the whole Porter flow — it's the payoff of the entire baseline→verify
    loop.
- **Actions:** "Submit verification & lock room" (irreversible — locks the baseline permanently, gate
  is explained in the copy right above the button) → "Back to my rooms" once results are shown.
- **States:** Loading; **error/blocked states worth designing explicitly:** "This room has no baseline
  to verify yet" and "This room's baseline has already been verified and locked" (both terminal,
  no-form states, distinct from a generic error); the live edit form; submit error; the results view
  with a mix of all four flag types (the realistic/common case to design for, since a session rarely
  ends with zero discrepancies).

---

## 6. Student pages (2 routes, 3 distinct top-level states) — *pre-redesign styling, candidate for new template*

Same plain shell pattern as Porter. The main dashboard route (`/student`) is the most complex single
page in the whole app — it renders one of three completely different experiences depending on the
student's state, all under one URL.

### 6.1 Student Dashboard — `/student`

This single route has three mutually-exclusive top-level views:

#### 6.1.a Onboarding (first-time state — no room allocation yet)

- **User story:** *As a new Student, on first login I want to tell the system which room the
  university's Kofa system actually placed me in, by picking from a dropdown — never by typing free
  text — so my account gets linked to the right room.*
- **Content:** A short explanatory heading + one dropdown (Hall/Room combined label, e.g. "Hall 3 —
  Room 12 A") sourced from every Admin-created room, and a "Confirm my room" button.
- **States:** Loading the room list; empty dropdown edge case (no rooms exist yet — unlikely but
  possible); submit error (e.g. no active session to allocate into); submitting.

#### 6.1.b My Room (has an allocation, baseline may or may not exist yet)

- **User story:** *As a Student, I want to see exactly what the Porter logged for my room, split into
  "my corner" (things only I'm responsible for) vs. "shared room items" (things the whole room shares),
  and independently confirm or dispute each grouping.*
- **Content:**
  - Room heading (hall/room/corner).
  - If no baseline recorded yet: a plain "not recorded yet, check back soon" message (no items to
    show) — an important, fully valid empty state, not an error.
  - If a baseline exists: an amber "Action needed: sign off on your Check-in Slip below" banner shown
    *only* while sign-off is still pending (disappears once complete — this is the UI expression of a
    backend-computed "pending" flag, worth designing as a dismissable-feeling but non-dismissable
    nudge).
  - **"My Corner"** section: table of asset/qty/condition, followed by that group's sign-off control.
  - **"Shared Room Items"** section: same structure, independent sign-off control.
  - A collapsed "Report a condition change" link at the bottom (see 6.1.c below — it's part of this
    same view, not a separate page).
- **The sign-off control (appears twice per page, once per group — a key reusable component):**
  - **Unsigned state:** two buttons, "Confirm" and "Dispute". Clicking Dispute reveals a required
    textarea ("Describe the issue…") with "Submit dispute" / "Cancel" — client-side blocked if the
    comment is empty.
  - **Signed state (terminal, read-only):** just a status label — "Confirmed" (green) or "Disputed"
    (amber) — plus the dispute comment quoted below it if one was given. No edit/undo affordance exists
    once signed; this is deliberate (an audit-trail integrity guarantee), so the read-only state should
    look clearly "final," not just disabled.
- **States to design:** no-baseline-yet; baseline with both groups fully signed (no banner); baseline
  with the pending banner and a mix of signed/unsigned groups; the dispute textarea open with a
  validation error; the two independent sign-off panels showing different statuses simultaneously
  (e.g. corner confirmed, shared disputed) — this combination is common and worth an explicit mock.

#### 6.1.c Condition Report (collapsible sub-form within My Room)

- **User story:** *As a Student, at any point during my stay — even after the baseline is locked — I
  want to flag something that changed (e.g. "the fan stopped working in March"), optionally tied to a
  specific item, without it counting as an edit to the original record.*
- **Content:** Starts collapsed behind a text link ("Report a condition change"). Expands into: an
  optional "related item" dropdown (deduplicated list of the room's own corner+shared asset types, plus
  a "General" option), a required description textarea, Submit/Close buttons.
- **States:** Collapsed (default); expanded/empty; validation error (empty description); success
  message shown inline after submit ("Report submitted. Thank you.") with the form reset but still
  expanded, ready for another report.

### 6.2 My Session History — `/student/history`

- **User story:** *As a Student, I want a read-only record of every room I've ever been allocated to,
  across every session — I can never edit or delete these, by design.*
- **Content:** A back link to My Room, then a table: Session (name + status), Hall/Room, Allocated
  (date), Status (active/vacated).
- **States:** Loading; empty ("You have no past room allocations yet.") — realistic for a first-session
  student; populated table, typically 1 row for most students but should be designed to hold several
  (a student across multiple academic sessions).

---

## 7. Page inventory (quick reference table)

| # | Route | Role | Redesigned? | One-line purpose |
| --- | --- | --- | --- | --- |
| 1 | `/` | Public | — | Landing / sign-in entry point |
| 2 | `/login` | Public | — | Authenticate, route to role dashboard |
| 3 | `/admin` | Admin | ✅ | At-a-glance system health (3 stats) |
| 4 | `/admin/halls` | Admin | ✅ | Register halls + hall type |
| 5 | `/admin/rooms` | Admin | ✅ | Register rooms within a hall |
| 6 | `/admin/users` | Admin | ✅ | Create/reset/deactivate Porter & Student accounts |
| 7 | `/admin/porter-assignments` | Admin | ✅ | Assign rooms to a Porter |
| 8 | `/admin/sessions` | Admin | ✅ | Open/close hostel sessions |
| 9 | `/admin/reports` | Admin | ✅ | Browse all baselines & verifications |
| 10 | `/admin/audit-log` | Admin | ✅ | Paginated, attributable action history |
| 11 | `/porter` | Porter | ⬜ | List of assigned rooms + status |
| 12 | `/porter/rooms/[id]/baseline` | Porter | ⬜ | Record a room's starting inventory |
| 13 | `/porter/rooms/[id]/verify` | Porter | ⬜ | Session-end re-check + auto-flagging |
| 14 | `/student` | Student | ⬜ | Onboarding / My Room / sign-off / condition report |
| 15 | `/student/history` | Student | ⬜ | Read-only past-allocation history |

---

## 8. Suggested design priorities

If you're feeding this into a template/design tool, the highest-value screens to design next (in
rough priority order) are:

1. **`/porter` (5.1)** — the Porter's first impression; needs the same visual status-language work the
   Admin's Sessions/Porter-Assignments pages already got (badges, clear per-row states).
2. **`/student` My Room (6.1.b)** — the most-used Student screen and the most complex single view in
   the app (two independent sign-off panels, a conditional banner, a nested form).
3. **`/porter/.../verify` results view (5.3)** — the highest-payoff visual moment in the Porter flow;
   the four-flag-type results table deserves real color/iconography design, not just text color.
4. **`/student` onboarding (6.1.a)** and **`/porter/.../baseline` (5.2)** — both are "fill out a form
   correctly" screens, lower visual complexity, good candidates for applying the same shadcn/ui
   dialog-and-form patterns already established on the Admin side.
5. **`/student/history` (6.2)** and the **landing page (3.1)** — simplest, lowest priority.
