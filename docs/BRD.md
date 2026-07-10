# BUSINESS REQUIREMENTS DOCUMENT

Hostel Asset and Property Management System (HAPMS)

University of Benin Student Hostels

Prepared for: Development Team

Prepared by: Osadolor Judy Ifeyinwa (PSC2207988) p

Document Version: 1.0

Date: July 2026

## Document Control

### Version History

| Version | Date      | Author                 | Description                                     |
| ------- | --------- | ---------------------- | ----------------------------------------------- |
| 1.0     | July 2026 | Osadolor Judy Ifeyinwa | Initial draft of Business Requirements Document |

### Purpose of this Document

This Business Requirements Document (BRD) describes, in non-technical terms, what the Hostel Asset and Property Management System (HAPMS) must do. It is intended to give a developer everything needed to produce a technical requirements specification and related downstream artefacts (system design, data model, test plan, and user acceptance criteria) without needing to consult the original project owner for basic clarification. It captures the business background, the people who will use the system, the rules that govern how the system must behave, and the specific capabilities each type of user requires.

This document is derived from the approved project proposal (Chapter One of the academic project report) and a detailed requirements-gathering conversation between the project owner and the system's stakeholder (Judy), which clarified the room categories, asset breakdowns, and sign-off workflow described throughout this document.

## 1. Introduction

### 1.1 Project Title

Design and Implementation of a Hostel Asset and Property Management System for Student Hostels (University of Benin).

### 1.2 Background

The University of Benin manages a large number of student hostel facilities, categorised into Regular Halls (Halls 1 to 4) and Special Halls (Hall 5, Hall 6, Hall 7, TETFUND Halls A to D, and Daisy Danjuma Hostel). At present, no formal record exists of what assets (mattresses, bunk beds, fans, cupboards, tables, chairs, window blinds) are present in a room when a student moves in, what condition those assets are in, or who is responsible for them.

Because there is no baseline record and no structured verification at the end of each session, assets are progressively lost or damaged with no accountability mechanism. Incoming students frequently meet incompletely furnished rooms, and neither students nor hostel staff have documentation to prove what a room actually contained at any point in time.

This project proposes a web-based system that gives hostel administration a structured, role-based way to record what is in every room at the start of a session, allow students to confirm and sign off on that record, and allow porters to verify what remains at the end of a session, flagging any discrepancy automatically.

### 1.3 Business Objectives

The system is being built to achieve the following business outcomes:

- Eliminate reliance on informal, paper-based, or verbal records of hostel asset allocation.
- Give every student a documented, signed-off record of what was in their room at check-in, protecting them from being blamed for pre-existing damage or shortages.
- Give hostel administration a reliable way to detect, at the end of each session, exactly what is missing or damaged, and link that to the responsible occupant.
- Reduce the volume of hostel assets lost each academic session and reduce the university's cost of replacing them.
- Give administrators visibility into asset status across all hostels through reports and an audit trail, supporting maintenance and procurement decisions.
- Provide each user (Administrator, Porter, Student) with only the information and actions relevant to their role.

## 2. Project Scope

### 2.1 In Scope

- A single web-based system with one login page that redirects each user to a role-specific dashboard (Administrator, Porter, or Student).
- Administrator-created accounts for Porters and Students — there is no public self-registration.
- Management of hostels and rooms, including assigning each room a category (Regular or Special) that determines which asset types apply to it.
- Recording of a Room Inventory Baseline by the Porter before a student moves in, listing every asset present and its condition.
- A student-facing check-in review and sign-off process, including a separate optional condition report the student can raise during their stay or before vacating.
- A Session-End Verification process for the Porter, comparing what remains in the room against the original baseline and automatically flagging missing or damaged items.
- A manual bridge with the university's Kofa room-allocation process: the student types in the room/hall Kofa assigned them, since Kofa is not integrated via API.
- Reporting for Administrators, filterable by hall, session, or asset type, with the ability to export results.
- An audit trail recording who performed which action and when, across the whole system.
- Role-based access control, so that each user can only see and act on what their role permits.
- Locking of a session's records once it is signed off, so historical records cannot be silently altered (only new correction notes may be added afterward).

### 2.2 Out of Scope

- Private, off-campus student accommodation.
- Financial management, billing, or payment processing of any kind.
- Procurement workflows (ordering or purchasing replacement assets).
- Maintenance scheduling or work-order management.
- Live/API integration with Kofa or any other university system — the Kofa connection is a manual text entry only, in this phase.
- Self-registration of Porter or Student accounts — all accounts are created by the Administrator.

### 2.3 Scope Note

The system is being designed and evaluated as a functional prototype within the University of Benin context, and it may require adaptation before it could be deployed at other institutions with different hostel structures.

## 3. Stakeholders and User Roles

The system recognises three distinct types of user. Every person using the system falls into exactly one of these roles, and what they can see or do is strictly limited by that role.

### 3.1 Administrator

The Administrator is hostel management staff responsible for overall configuration and oversight of the system. The Administrator does not create day-to-day asset records themselves; that responsibility sits with the Porter.

### 3.2 Porter

The Porter is hostel operational staff responsible for a defined set of assigned rooms. The Porter is the only role that can create a Room Inventory Baseline and the only role that can perform Session-End Verification.

### 3.3 Student

The Student is a hostel occupant. A Student can only view and sign off on their own room's records; they cannot create, edit, or view any other student's room.

### 3.4 RACI Summary

| Activity                             | Administrator | Porter      | Student     |
| ------------------------------------ | ------------- | ----------- | ----------- |
| Create user accounts                 | Responsible   | —           | —           |
| Manage hostels/rooms & categories    | Responsible   | —           | —           |
| Create Room Inventory Baseline       | —             | Responsible | —           |
| Review & sign off on check-in record | —             | —           | Responsible |
| Submit condition report              | —             | —           | Responsible |
| Session-End Verification             | —             | Responsible | —           |
| View reports & audit trail           | Responsible   | —           | —           |

## 4. Business Process Overview

At a high level, the asset lifecycle for a single hostel room in a single session follows this sequence:

1. The Administrator creates the hostel and room records (e.g. "Hall 3, Room 12") and assigns each room a category (Regular or Special). The category determines which asset types are valid for that room.
2. The Administrator creates accounts for the Porters and Students who need access, and assigns Porters to the halls/rooms they are responsible for.
3. Before a new student moves in, the assigned Porter opens the room in the system and records the Room Inventory Baseline — checking off exactly what assets are present and their condition. The form only presents asset types that are valid for that room's category.
4. The student is allocated a room/hall through the university's existing Kofa process (outside this system). On first login, the student manually enters the room/hall that Kofa allocated them.
5. The student views the assets recorded for their room, split into their own "corner" items (mattress, table, chair) and the "shared room" items (cupboard, window blind, bunk beds, fan). The student reviews and independently signs off on each of these two groupings.
6. During the session, the student may optionally submit a condition report if something changes (e.g. "the fan stopped working in March").
7. At the end of the session, the Porter opens the room and performs Session-End Verification, comparing the room's current state against the original Room Inventory Baseline. The system automatically highlights any differences (missing, damaged, or added items).
8. Once the session is closed and signed off, all of that session's records become read-only. Any further correction must be added as a new note rather than an edit to the historical record.
9. Throughout the process, every action is timestamped and attributed to the user who performed it, and is visible to the Administrator through the audit trail.

## 5. Detailed Business Requirements

Requirements are grouped by the part of the system they belong to. Priority is expressed as Must Have, Should Have, or Could Have, following the MoSCoW convention, to help the developer sequence work.

### 5.1 Login and Account Management

| ID     | Requirement Description                                                                                                                              | Priority  |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| BR-1.1 | The system shall provide a single login page shared by all user roles.                                                                               | Must Have |
| BR-1.2 | Upon successful login, the system shall automatically route the user to the dashboard appropriate to their role (Administrator, Porter, or Student). | Must Have |
| BR-1.3 | Porter and Student accounts shall only be created by an Administrator; there shall be no public self-registration.                                   | Must Have |
| BR-1.4 | The system shall provide a password reset mechanism and enforce basic account security practices (e.g. minimum password strength).                   | Must Have |
| BR-1.5 | On a Student's first login, the system shall prompt them to enter the room/hall that Kofa allocated to them (see Section 5.5).                       | Must Have |

### 5.2 Administrator Requirements

#### 5.2.1 Dashboard

| ID     | Requirement Description                                                                                                                                                                                                                                     | Priority  |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| BR-2.1 | The Administrator dashboard shall present a summary of overall system status at a glance, including total number of rooms and total number of flagged asset problems, in the way a banking app shows an account balance before the user drills into detail. | Must Have |

#### 5.2.2 Hostel and Room Management

| ID     | Requirement Description                                                                                                                                               | Priority  |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| BR-2.2 | The Administrator shall be able to create and manage hostels and individual rooms (e.g. "Hall 3, Room 12").                                                           | Must Have |
| BR-2.3 | The Administrator shall be able to set a room's category as either Regular or Special.                                                                                | Must Have |
| BR-2.4 | Once a room's category is set, the system shall automatically determine which asset types are applicable to that room, based on the category/hall rules in Section 6. | Must Have |

#### 5.2.3 User Account Management

| ID     | Requirement Description                                                                 | Priority  |
| ------ | --------------------------------------------------------------------------------------- | --------- |
| BR-2.5 | The Administrator shall be able to add and remove Porter and Student accounts.          | Must Have |
| BR-2.6 | The Administrator shall be able to assign Porters and Students to specific halls/rooms. | Must Have |

#### 5.2.4 Reporting

| ID     | Requirement Description                                                                                                            | Priority    |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| BR-2.7 | The Administrator shall be able to generate reports filtered by hall, session, or asset type.                                      | Must Have   |
| BR-2.8 | The Administrator shall be able to export report results (e.g. as a downloadable/printable file), similar to generating a receipt. | Should Have |

#### 5.2.5 Audit Trail

| ID     | Requirement Description                                                                                                                                                            | Priority  |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| BR-2.9 | The Administrator shall have access to an audit trail page showing a chronological history of every asset-related action taken in the system, including who performed it and when. | Must Have |

### 5.3 Porter Requirements

| ID     | Requirement Description                                                                                                                                                                                             | Priority  |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| BR-3.1 | The Porter shall see a list of only the rooms they are personally responsible for ("My Assigned Rooms"), not the entire school.                                                                                     | Must Have |
| BR-3.2 | The Porter shall be able to open a room and complete a Baseline Entry Form before a new student moves in, checking off which assets are actually present.                                                           | Must Have |
| BR-3.3 | The Baseline Entry Form shall only display asset types that are valid for that room's category, preventing a Porter from logging an asset that does not apply to that hall (e.g. a window blind in a Regular hall). | Must Have |
| BR-3.4 | At the end of a session, the Porter shall be able to open a Session-End Verification screen that compares the room's current contents against the original baseline.                                                | Must Have |
| BR-3.5 | The system shall automatically highlight any assets that are missing or recorded as damaged during Session-End Verification, rather than requiring the Porter to compare manually.                                  | Must Have |

### 5.4 Student Requirements

| ID     | Requirement Description                                                                                                                                                                     | Priority  |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| BR-4.1 | The Student shall have a "My Room" page showing exactly what the Porter logged for their room at check-in.                                                                                  | Must Have |
| BR-4.2 | Room assets shall be presented to the student split into two groupings: "My Corner" (mattress, table, chair) and "Shared Room Items" (cupboard, window blind, bunk beds, fan).              | Must Have |
| BR-4.3 | The Student shall be able to independently review and sign off on the corner-level items and the shared room-level items (i.e. two separate sign-off actions, not one combined action).     | Must Have |
| BR-4.4 | A Student's sign-off shall act as their digital signature, confirming the list is accurate and protecting them from being blamed later for damage they did not cause.                       | Must Have |
| BR-4.5 | The Student shall be able to optionally submit a condition report at any point before vacating, flagging anything that changed during their stay (e.g. "the fan stopped working in March"). | Must Have |
| BR-4.6 | The Student shall be able to view a read-only history of their own past session records; no student may edit a historical record.                                                           | Must Have |
| BR-4.7 | No Student action shall be able to create or alter an official asset record — Students may only view, sign off, or submit a condition report.                                               | Must Have |

#### 5.4A Student Contest / Dispute Handling

When a student reviews the Check-in Slip and disagrees with what the Porter has logged, the system shall not force a binary accept-or-reject choice. Instead, a student may sign off while simultaneously recording a disagreement, so that their sign-off is never mistaken for silent agreement with an inaccurate record.

| ID      | Requirement Description                                                                                                                                                                                                                                     | Priority                |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| BR-4.8  | The Student shall be able to attach a free-text dispute note to a corner-level or shared-room-level sign-off (e.g. "signed off, but disputes item: window blind — missing at check-in").                                                                    | Must Have               |
| BR-4.9  | A sign-off submitted with a dispute note shall still be treated as a valid, completed sign-off for workflow purposes (the session is not blocked from progressing), but the dispute note shall be permanently and visibly attached to that sign-off record. | Must Have               |
| BR-4.10 | Dispute notes shall appear in the Administrator's audit trail and in the Porter's view of that room, so the disagreement is visible to both oversight roles without requiring a separate resolution workflow in this phase.                                 | Must Have               |
| BR-4.11 | The system shall not require an Administrator or Porter to formally close or resolve a dispute note in this phase; it exists as a permanent record, not an open ticket.                                                                                     | Won't Have (this phase) |

#### 5.4B Shared-Room Item Sign-off Logic

Because Regular halls house up to 8 occupants per room, and Special halls house 2–4, the BRD must state clearly how many of those occupants need to act before the Shared Room Items grouping (Section 6.5) counts as confirmed.

| ID      | Requirement Description                                                                                                                                                                                                                                  | Priority    |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| BR-4.12 | The Shared Room Items grouping for a given room shall be considered confirmed once any one occupant of that room has signed off on it.                                                                                                                   | Must Have   |
| BR-4.13 | Once one occupant has signed off on the Shared Room Items, the system shall still allow other occupants of the same room to independently view and sign off afterward, but this is not required for the room's shared record to be considered confirmed. | Should Have |
| BR-4.14 | Each occupant's "My Corner" sign-off (mattress, table, chair) is individual and unaffected by BR-4.12 — every student must still sign off on their own corner-level items independently, regardless of what other occupants of the room have done.       | Must Have   |

Rationale: this models real hostel behaviour — a shared cupboard does not need eight separate confirmations to be "confirmed as present," but each student's personal mattress absolutely does need their own individual sign-off, since only they are responsible for it.

### 5.5 The Kofa Bridge

The university already allocates students to hostel rooms through an existing process called Kofa. This project does not integrate with Kofa directly. Instead, the system provides a simple field, shown during the student's first-login flow, where the student manually types in the room/hall that Kofa allocated to them. No separate page is required for this.

| ID     | Requirement Description                                                                                                           | Priority                |
| ------ | --------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| BR-5.1 | The system shall provide a manual entry field for the student to record their Kofa-allocated room/hall, shown during first login. | Must Have               |
| BR-5.2 | No live/API integration with Kofa is required in this phase.                                                                      | Won't Have (this phase) |

### 5.6 System-Wide (Cross-Cutting) Requirements

| ID     | Requirement Description                                                                                                                                                                                         | Priority  |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| BR-6.1 | The system shall enforce role-based access control so that a Student cannot view another student's room, and a Porter cannot access Administrator settings.                                                     | Must Have |
| BR-6.2 | Every action in the system shall automatically record who performed it and when, without requiring manual date entry.                                                                                           | Must Have |
| BR-6.3 | Once a session ends and is signed off, its records shall become read-only; no one may quietly edit historical records afterward. Any subsequent correction must be added as a new, separately timestamped note. | Must Have |

### 5.7 Session Management

Section 4 (Business Process Overview) and BR-6.3 assume sessions exist, start, and end, but do not state who creates or closes them. This section closes that gap.

| ID     | Requirement Description                                                                                                                                                                                                                           | Priority    |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| BR-7.1 | The Administrator shall be able to create a new Hostel Session (e.g. "2026/2027 Session, First Semester") with a defined start reference point.                                                                                                   | Must Have   |
| BR-7.2 | All Room Inventory Baselines, sign-offs, and condition reports created by Porters and Students shall be automatically associated with the currently active session for that room — no manual session selection required from Porters or Students. | Must Have   |
| BR-7.3 | The Administrator shall be able to mark a session as closed once all rooms under it have completed Session-End Verification, at which point BR-6.3 (record locking) takes effect for that session.                                                | Must Have   |
| BR-7.4 | The system shall prevent a new Room Inventory Baseline from being created for a room that already has an open, unclosed session, avoiding duplicate or conflicting active records for the same room.                                              | Must Have   |
| BR-7.5 | The Administrator shall be able to view which sessions are currently open versus closed, across all halls, from the reporting area described in Section 5.2.4.                                                                                    | Should Have |

### 5.8 Notifications

The BRD as originally written is entirely pull-based — someone must log in to see that action is needed. This section adds minimal, low-effort visibility so nothing silently stalls, while explicitly keeping email/SMS out of scope.

| ID     | Requirement Description                                                                                                                                                                           | Priority                                                |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| BR-8.1 | The Student dashboard shall visibly indicate, on login, if there is a pending Check-in Slip awaiting their sign-off.                                                                              | Conditional (stretch goal — see Technical MVP Document) |
| BR-8.2 | The Porter dashboard shall visibly indicate, on login, which of their assigned rooms have not yet completed a Room Inventory Baseline, and which have a session pending Session-End Verification. | Conditional (stretch goal — see Technical MVP Document) |
| BR-8.3 | The Administrator dashboard (per BR-2.1) shall include a count of rooms with pending, not-yet-signed-off Check-in Slips, alongside the existing count of flagged asset problems.                  | Conditional (stretch goal — see Technical MVP Document) |
| BR-8.4 | Email or SMS notifications are explicitly out of scope for this phase; all notification in this system is in-app, visible only upon login.                                                        | Won't Have (this phase)                                 |

BR-8.1 to BR-8.3 are deliberately marked Conditional rather than Must Have or Cut. Whether they are built depends on a schedule checkpoint defined in the Technical MVP Document; if development is on track they are added late in the build, and if not they are deferred without any loss to the core system.

### 5.9 Photo Evidence (Future Enhancement)

This is recorded as a future-facing capability, not committed implementation scope, so that it does not compete with Must Have items for development time.

| ID     | Requirement Description                                                                                                                        | Priority   |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| BR-9.1 | The system may allow a Porter, during Baseline Entry or Session-End Verification, to optionally attach a photo to an asset marked as damaged.  | Could Have |
| BR-9.2 | The system may allow a Student to optionally attach a photo when submitting a condition report.                                                | Could Have |
| BR-9.3 | Photo evidence, where implemented, shall be stored and linked to the specific asset record and timestamp it relates to, not stored separately. | Could Have |

## 6. Hostel and Asset Category Reference

This section defines the business rules that determine which assets are valid for each hostel, and how those assets are grouped for the purposes of the student's corner-level vs. shared-room-level sign-off (Section 5.4). These rules must drive the Baseline Entry Form (Section 5.3) and the Room Inventory Baseline referenced throughout this document.

### 6.1 Regular Halls (Halls 1–4)

| Attribute              | Value                                                                  |
| ---------------------- | ---------------------------------------------------------------------- |
| Occupancy              | 8 people per room                                                      |
| Bunk beds              | 4 bunk beds per room (shared room item)                                |
| Fan                    | 1 fan per room (shared room item)                                      |
| Cupboards              | 4 cupboards per room, shared 2 people to 1 cupboard (shared room item) |
| Student "corner" items | None recorded at individual level for Regular halls                    |

### 6.2 TETFUND Halls A–D and Daisy Danjuma Hostel

| Attribute    | Value                                                 |
| ------------ | ----------------------------------------------------- |
| Occupancy    | 4 people per room                                     |
| Bunk beds    | 2 bunk beds per room (shared room item)               |
| Mattresses   | 4 mattresses (student corner item)                    |
| Tables       | At least 1 table (student corner item)                |
| Chairs       | Chairs matching the table count (student corner item) |
| Window blind | Included (shared room item)                           |
| Cupboards    | Count still to be confirmed                           |

### 6.3 Hall 6

| Attribute    | Value                                                 |
| ------------ | ----------------------------------------------------- |
| Occupancy    | 4 people per room                                     |
| Bunk beds    | 2 bunk beds per room (shared room item)               |
| Mattresses   | 4 mattresses (student corner item)                    |
| Tables       | Up to 4 tables (student corner item)                  |
| Chairs       | Chairs matching the table count (student corner item) |
| Window blind | Included (shared room item)                           |
| Cupboards    | 4 cupboards per room, 1 per person (shared room item) |

### 6.4 Hall 7 (Corners A and B only)

| Attribute    | Value                                                 |
| ------------ | ----------------------------------------------------- |
| Occupancy    | 2 people per room                                     |
| Beds         | 2 single beds, no upper bunk (shared room item)       |
| Mattresses   | 2 mattresses (student corner item)                    |
| Tables       | At least 1 table (student corner item)                |
| Chairs       | Chairs matching the table count (student corner item) |
| Window blind | Included (shared room item)                           |
| Cupboards    | 1 cupboard                                            |

### 6.5 Corner vs. Shared Room Item Grouping

Regardless of hall, the student-facing view always splits assets into two groups, each with its own independent sign-off:

- **My Corner** (individually tracked per student): mattress, table, chair.
- **Shared Room Items** (tracked once per room, applicable to every occupant): cupboard, window blind, bunk beds, fan.

Regular halls do not currently record any corner-level items separately; all Regular hall assets fall under shared room items. This should be confirmed with the project owner before implementation, as it may evolve as the category rules are finalised.

## 7. Business Rules

- A room's category (Regular or Special) determines which asset types may be logged against it; the Baseline Entry Form must not offer asset types outside that room's category.
- Only a Porter may create a Room Inventory Baseline; no other role may create or backdate one.
- A Student may never create or alter an official asset record; their only actions are: view, sign off (corner and shared, independently), and submit an optional condition report.
- Corner-level sign-off and shared-room-level sign-off are two separate, independent confirmations by the Student — one is not a substitute for the other.
- Once a session is closed and signed off, its records are locked and become read-only. Corrections after that point must be recorded as new, separately timestamped notes, not edits to the original record.
- Every record and action carries an automatic timestamp and the identity of the user who performed it; no manual date entry is permitted or required.
- A Porter may only see and act on rooms they are assigned to; an Administrator may see and act on all rooms.
- A Student may only see and act on their own room; they cannot view another student's room or records.
- Kofa room allocation is captured as a single manually entered field during the student's first login; it is not validated against any external system in this phase.
- A student's sign-off is final at the point of submission, whether or not it carries a dispute note; disputes do not block session progression.
- Shared Room Item confirmation requires only one valid occupant sign-off per room per session; corner-level sign-off remains mandatory for every individual occupant.
- A room cannot have two open (unclosed) sessions running at the same time.
- All notifications in this phase are in-app only; no email/SMS integration is included.

## 8. Assumptions

- Hostel administration will supply accurate, up-to-date hall and room category data for the Administrator to enter into the system.
- Students, Porters, and Administrators will have access to a functioning internet-connected device to use the system.
- The Kofa room allocation process will continue to run outside this system for the foreseeable future; students will self-report their Kofa-allocated room accurately.
- The cupboard count for TETFUND Halls A–D and Daisy Danjuma Hostel will be confirmed with hostel administration before the Baseline Entry Form is finalised for those halls.
- Porters will be trained on how to use the Baseline Entry Form and Session-End Verification screen before go-live.

## 9. Constraints and Limitations

- The system is being developed and evaluated as a functional prototype within a simulated environment reflecting selected UNIBEN hostel contexts, rather than deployed across every hostel facility at the University.
- The system depends on stable internet connectivity and functioning digital devices; this may limit usability where network access is inconsistent.
- The system is designed specifically for the University of Benin's hostel structure and session model; adaptation would be needed before use at another institution.
- No live integration with Kofa, financial systems, procurement systems, or maintenance scheduling systems is included in this phase.

## 10. Success Criteria / Acceptance Criteria

The project will be considered successful when the following outcomes can be demonstrated:

- An Administrator can create a hostel, add rooms with categories, and see those categories correctly restrict the asset types available on the Baseline Entry Form.
- A Porter can complete a Baseline Entry Form for an assigned room and the record is visible, correctly attributed, and timestamped.
- A Student can view their room's assets split into corner and shared groupings, and can sign off on each independently.
- A Student can submit an optional condition report and it appears against their room's history.
- A Porter can perform Session-End Verification and the system automatically flags any item that differs from the original baseline.
- Once a session is signed off, attempts to edit its historical records are blocked, and any further note is recorded as a new, separately timestamped entry.
- An Administrator can generate a report filtered by hall, session, or asset type, and export the result.
- An Administrator can view an audit trail showing who performed each action and when, across all halls.
- The system passes black-box functional testing and a User Acceptance Test (UAT) conducted with selected hostel administrators and students.
- A Student can sign off on a Check-in Slip while attaching a dispute note, and that note is visible to both the Porter and the Administrator without requiring a separate resolution action.
- When any one occupant of a shared room signs off on Shared Room Items, the room's shared record is marked confirmed; each occupant's individual corner sign-off remains tracked separately per student.
- An Administrator can open a new session, and the system prevents a second baseline being created for a room with an already-open session.
- If built (see Section 5.8), Student and Porter dashboards visibly indicate pending actions on login, without requiring email or SMS.

## 11. Glossary of Terms

**Asset**: A room furnishing or fitting allocated to a student occupant (e.g. mattress, bunk bed, table, chair, fan, cupboard, window blind), tracked across academic sessions.

**Asset Allocation**: The act, performed by a Porter through the system, of formally recording the assets present in a room and assigning responsibility for them to a student at the start of a session.

**Asset Condition Report**: An optional record a student submits describing the observed state of assets in their room, ahead of the porter's session-end verification.

**Check-in Slip**: The digitally generated list of assets and their condition for a specific room, created by the Porter, that the student reviews and signs off on at check-in.

**Hostel Session**: The defined academic period during which a student occupies an allocated hostel room; all documentation and verification is organised around this cycle.

**Kofa**: The University's existing (external) process for allocating students to hostel rooms/halls; connected to this system only via manual entry, not API integration.

**Occupant Sign-off**: The digital confirmation action a student performs after reviewing the Check-in Slip. A sign-off may optionally include an attached dispute note describing a specific disagreement; the sign-off remains valid and final either way.

**Porter**: Hostel operational staff responsible for a set of assigned rooms; creates baselines and performs session-end verification.

**Role-Based Access Control (RBAC)**: The security model restricting each user to only the functions relevant to their role (Administrator, Porter, or Student).

**Room Inventory Baseline**: The authoritative record of all assets present in a room, and their condition, at the start of a session, created by the Porter before the student moves in.

**Session-End Verification**: The audit process a Porter performs at the close of a session, comparing the room's current state against its baseline and recording any discrepancies.
