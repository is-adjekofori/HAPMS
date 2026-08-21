# Chapter 3 Diagrams — Mermaid Source

How to use: in draw.io, go to **Extras → Edit Diagram**, paste one block's code (without the ` ```mermaid ` fence lines) into the panel, and confirm. Or, in newer draw.io versions, **Arrange panel → Mermaid** offers a dedicated import box. Each diagram below is self-contained — import one at a time.

Two notes on fidelity: Mermaid has no native UML **use case** notation or **DFD** notation, so Figures 3.3, 3.9, and 3.10 are built from Mermaid's flowchart primitives (circles for processes/use cases, stadium/rectangle shapes for actors/external entities) rather than textbook UML/Gozinto symbols. If your supervisor expects strict UML use-case ellipses or Gane-Sarson DFD shapes, re-draw those two shapes manually in draw.io after import — the structure and labels are already correct, only the shape style would need adjusting. Everything else (sequence, class, ER, flowcharts) uses Mermaid's native diagram types and will import faithfully.

**On page orientation**: Figures 3.1, 3.2, 3.3, 3.4, 3.8, 3.9, and 3.10 are now laid out as wide, short bands (roughly 5:1 to 29:1 width:height) — insert these on a landscape-oriented page. Figures 3.6 (Class Diagram) and 3.7 (ER Diagram) stay closer to square/tall (~1.1–1.6:1) even after switching direction, because they each carry 15 entities with multiple attributes — that's a content-volume issue, not something orientation alone fixes without dropping detail; a landscape page still gives them more usable width than portrait. Figure 3.5 (Sequence Diagram) is conventionally vertical by notation (time flows top-to-bottom) and is a reasonable size as-is.

---

## Figure 3.1: Diagram of the Incremental Development Model

```mermaid
flowchart LR
    I1["Increment 1<br/>Foundations &amp; Data Layer"] --> I2["Increment 2<br/>Authentication &amp; RBAC"] --> I3["Increment 3<br/>Administrator Configuration"] --> I4["Increment 4<br/>Porter Baseline Entry"] --> I5["Increment 5<br/>Student Onboarding &amp; Room View"] --> I6["Increment 6<br/>Student Sign-off &amp; Dispute Handling"] --> I7["Increment 7<br/>Condition Reports &amp; History"] --> I8["Increment 8<br/>Session-End Verification &amp; Locking"] --> I9["Increment 9<br/>Admin Reporting &amp; Audit Trail"] --> I10["Increment 10<br/>Pending-Action Indicators"] --> I11["Increment 11<br/>Cross-Role Hardening"] --> I12["Increment 12<br/>Delivery"]
```

---

## Figure 3.2: System Architecture Diagram

```mermaid
flowchart LR
    subgraph Client["Presentation Tier"]
        A["Browser<br/>Next.js + TypeScript + Tailwind CSS"]
    end
    subgraph Server["Application Tier"]
        B["FastAPI Backend (Python)<br/>Auth &amp; RBAC (JWT)<br/>Business Logic"]
    end
    subgraph Data["Data Tier"]
        C[("MySQL Database")]
    end
    A -- "HTTPS / JSON (Bearer JWT)" --> B
    B -- "JSON Response" --> A
    B -- "SQLAlchemy ORM" --> C
    C -- "Query Results" --> B
```

---

## Figure 3.3: Use Case Diagram

```mermaid
flowchart TB
    subgraph AdminRow[" "]
        direction LR
        Admin(["Administrator"]) --- UC1(("Manage Halls &amp; Rooms")) --- UC2(("Manage User Accounts")) --- UC3(("Manage Sessions")) --- UC4(("View Reports &amp; Audit Trail"))
    end
    subgraph PorterRow[" "]
        direction LR
        Porter(["Porter"]) --- UC5(("Record Baseline")) --- UC6(("Verify Session"))
    end
    subgraph StudentRow[" "]
        direction LR
        Student(["Student"]) --- UC7(("Select Allocated Room")) --- UC8(("Sign Off on Room Record")) --- UC9(("Submit Condition Report")) --- UC10(("View History"))
    end
```

---

## Figure 3.4: Activity Diagram (Room Lifecycle)

```mermaid
flowchart LR
    Start([Start]) --> A[Administrator creates Hall &amp; Room]
    A --> B[Administrator opens Hostel Session]
    B --> C[Porter records Room Inventory Baseline]
    C --> D[Student allocated room via Kofa]
    D --> E[Student reviews baseline]
    E --> F{Student agrees<br/>with record?}
    F -- Yes --> G[Student signs off: Confirmed]
    F -- No --> H[Student signs off: Contested<br/>+ Dispute Comment]
    G --> I{Condition changes<br/>during stay?}
    H --> I
    I -- Yes --> J[Student submits Condition Report]
    I -- No --> K[Session continues]
    J --> K
    K --> L[Porter performs Session-End Verification]
    L --> M[System computes discrepancy flags]
    M --> N[Baseline &amp; sign-offs locked]
    N --> End([End])
```

---

## Figure 3.5: Sequence Diagram (Student Sign-off)

```mermaid
sequenceDiagram
    actor S as Student
    participant FE as Browser (Next.js)
    participant BE as FastAPI Backend
    participant DB as MySQL Database

    S->>FE: Review baseline & choose Confirm/Contest
    FE->>BE: POST /student/signoff (baseline_id, group, status, comment?)
    BE->>BE: Verify JWT & Student role
    BE->>DB: Confirm allocation belongs to Student
    DB-->>BE: Allocation record
    BE->>DB: Check baseline.locked = false
    DB-->>BE: Baseline record
    alt Baseline is locked
        BE-->>FE: 409 Conflict
        FE-->>S: Show error: already locked
    else Baseline is open
        BE->>DB: INSERT sign_offs record
        DB-->>BE: Sign-off saved
        BE-->>FE: 200 OK (sign-off status)
        FE-->>S: Show updated sign-off status
    end
```

---

## Figure 3.6: Class Diagram

```mermaid
classDiagram
    direction LR
    class User {
        +int id
        +string full_name
        +string email
        +string password_hash
        +Role role
        +bool is_active
    }
    class Hall {
        +int id
        +string name
        +HallType hall_type
    }
    class Room {
        +int id
        +int hall_id
        +string room_number
        +string corner_label
        +int capacity
    }
    class PorterRoomAssignment {
        +int id
        +int porter_id
        +int room_id
    }
    class AssetType {
        +int id
        +string code
        +string display_name
        +SignOffGroup sign_off_group
    }
    class HallAssetRule {
        +int id
        +HallType hall_type
        +int asset_type_id
        +int default_quantity
    }
    class HostelSession {
        +int id
        +string name
        +SessionStatus status
        +datetime started_at
        +datetime closed_at
    }
    class StudentRoomAllocation {
        +int id
        +int student_id
        +int room_id
        +int session_id
        +AllocationStatus status
    }
    class RoomInventoryBaseline {
        +int id
        +int room_id
        +int session_id
        +int created_by
        +bool locked
    }
    class BaselineItem {
        +int id
        +int baseline_id
        +int asset_type_id
        +int quantity
        +Condition condition
    }
    class SignOff {
        +int id
        +int baseline_id
        +int student_id
        +SignOffGroup sign_off_group
        +SignOffStatus status
        +string comment
    }
    class ConditionReport {
        +int id
        +int allocation_id
        +int asset_type_id
        +string description
        +ReportStatus status
    }
    class SessionEndVerification {
        +int id
        +int baseline_id
        +int verified_by
        +datetime verified_at
    }
    class VerificationItem {
        +int id
        +int verification_id
        +int baseline_item_id
        +int current_quantity
        +Condition current_condition
        +Flag flag
    }
    class AuditLog {
        +int id
        +int user_id
        +string action
        +string entity_type
        +int entity_id
        +string description
    }

    Hall "1" --> "many" Room : contains
    Room "1" --> "many" PorterRoomAssignment : assigned via
    User "1" --> "many" PorterRoomAssignment : porter
    AssetType "1" --> "many" HallAssetRule : referenced by
    Room "1" --> "many" RoomInventoryBaseline : has
    HostelSession "1" --> "many" RoomInventoryBaseline : scopes
    User "1" --> "many" RoomInventoryBaseline : created_by
    RoomInventoryBaseline "1" --> "many" BaselineItem : contains
    AssetType "1" --> "many" BaselineItem : type_of
    RoomInventoryBaseline "1" --> "many" SignOff : signed_via
    User "1" --> "many" SignOff : student
    User "1" --> "many" StudentRoomAllocation : student
    Room "1" --> "many" StudentRoomAllocation : allocated_to
    HostelSession "1" --> "many" StudentRoomAllocation : within
    StudentRoomAllocation "1" --> "many" ConditionReport : reports
    AssetType "1" --> "many" ConditionReport : concerns
    RoomInventoryBaseline "1" --> "1" SessionEndVerification : verified_by
    User "1" --> "many" SessionEndVerification : verified_by
    SessionEndVerification "1" --> "many" VerificationItem : contains
    BaselineItem "1" --> "1" VerificationItem : compared_against
    User "1" --> "many" AuditLog : performs
```

---

## Figure 3.7: Entity-Relationship Diagram

```mermaid
erDiagram
    HALLS ||--o{ ROOMS : contains
    ROOMS ||--o{ PORTER_ROOM_ASSIGNMENTS : "assigned via"
    USERS ||--o{ PORTER_ROOM_ASSIGNMENTS : porter
    ASSET_TYPES ||--o{ HALL_ASSET_RULES : "referenced by"
    ROOMS ||--o{ ROOM_INVENTORY_BASELINES : has
    SESSIONS ||--o{ ROOM_INVENTORY_BASELINES : scopes
    USERS ||--o{ ROOM_INVENTORY_BASELINES : "created by"
    ROOM_INVENTORY_BASELINES ||--o{ BASELINE_ITEMS : contains
    ASSET_TYPES ||--o{ BASELINE_ITEMS : "type of"
    ROOM_INVENTORY_BASELINES ||--o{ SIGN_OFFS : "signed via"
    USERS ||--o{ SIGN_OFFS : student
    USERS ||--o{ STUDENT_ROOM_ALLOCATIONS : student
    ROOMS ||--o{ STUDENT_ROOM_ALLOCATIONS : "allocated to"
    SESSIONS ||--o{ STUDENT_ROOM_ALLOCATIONS : within
    STUDENT_ROOM_ALLOCATIONS ||--o{ CONDITION_REPORTS : reports
    ASSET_TYPES ||--o{ CONDITION_REPORTS : concerns
    ROOM_INVENTORY_BASELINES ||--|| SESSION_END_VERIFICATIONS : "verified by"
    USERS ||--o{ SESSION_END_VERIFICATIONS : "verified by"
    SESSION_END_VERIFICATIONS ||--o{ VERIFICATION_ITEMS : contains
    BASELINE_ITEMS ||--|| VERIFICATION_ITEMS : "compared against"
    USERS ||--o{ AUDIT_LOGS : performs

    USERS {
        int id PK
        string full_name
        string email
        string role
    }
    HALLS {
        int id PK
        string name
        string hall_type
    }
    ROOMS {
        int id PK
        int hall_id FK
        string room_number
        string corner_label
        int capacity
    }
    SESSIONS {
        int id PK
        string name
        string status
    }
    ROOM_INVENTORY_BASELINES {
        int id PK
        int room_id FK
        int session_id FK
        int created_by FK
        bool locked
    }
    BASELINE_ITEMS {
        int id PK
        int baseline_id FK
        int asset_type_id FK
        int quantity
        string condition
    }
    SIGN_OFFS {
        int id PK
        int baseline_id FK
        int student_id FK
        string sign_off_group
        string status
        string comment
    }
    SESSION_END_VERIFICATIONS {
        int id PK
        int baseline_id FK
        int verified_by FK
    }
    VERIFICATION_ITEMS {
        int id PK
        int verification_id FK
        int baseline_item_id FK
        int current_quantity
        string current_condition
        string flag
    }
    STUDENT_ROOM_ALLOCATIONS {
        int id PK
        int student_id FK
        int room_id FK
        int session_id FK
        string status
    }
    CONDITION_REPORTS {
        int id PK
        int allocation_id FK
        int asset_type_id FK
        string description
    }
    ASSET_TYPES {
        int id PK
        string code
        string display_name
        string sign_off_group
    }
    HALL_ASSET_RULES {
        int id PK
        string hall_type
        int asset_type_id FK
        int default_quantity
    }
    PORTER_ROOM_ASSIGNMENTS {
        int id PK
        int porter_id FK
        int room_id FK
    }
    AUDIT_LOGS {
        int id PK
        int user_id FK
        string action
        string entity_type
    }
```

---

## Figure 3.8: Session-End Verification Flowchart

```mermaid
flowchart LR
    Start([Start]) --> Loop[For each baseline item]
    Loop --> Enter[Porter enters current_quantity &amp; current_condition]
    Enter --> Q1{current_condition == missing?}
    Q1 -- Yes --> FlagMissing[flag = missing]
    Q1 -- No --> Q2{current_condition == damaged AND<br/>baseline condition != damaged?}
    Q2 -- Yes --> FlagDamaged[flag = damaged]
    Q2 -- No --> Q3{current_quantity < baseline_quantity?}
    Q3 -- Yes --> FlagMismatch[flag = quantity_mismatch]
    Q3 -- No --> FlagOk[flag = ok]
    FlagMissing --> Store[Store verification_item with flag]
    FlagDamaged --> Store
    FlagMismatch --> Store
    FlagOk --> Store
    Store --> More{More items?}
    More -- Yes --> Loop
    More -- No --> Lock[Set baseline.locked = true]
    Lock --> End([End])
```

---

## Figure 3.9: Data Flow Diagram (Level 0 — Context Diagram)

```mermaid
flowchart LR
    Admin[["Administrator"]]
    Porter[["Porter"]]
    Student[["Student"]]
    Sys((HAPMS))

    Admin -- "Hall/Room/User/Session data" --> Sys
    Sys -- "Reports &amp; Audit Trail" --> Admin
    Porter -- "Baseline &amp; Verification data" --> Sys
    Sys -- "Assigned rooms &amp; flags" --> Porter
    Student -- "Sign-offs &amp; Condition Reports" --> Sys
    Sys -- "Room record &amp; history" --> Student
```

---

## Figure 3.10: Data Flow Diagram (Level 1)

```mermaid
flowchart LR
    Admin[["Administrator"]]
    Porter[["Porter"]]
    Student[["Student"]]

    P1((1.0<br/>Manage Configuration))
    P2((2.0<br/>Record Baseline))
    P3((3.0<br/>Process Sign-off))
    P4((4.0<br/>Verify Session))
    P5((5.0<br/>Generate Reports))

    DB[("HAPMS Database")]

    Admin --> P1
    P1 --> DB
    DB --> P1
    P1 --> Admin

    Porter --> P2
    P2 --> DB
    DB --> P2
    P2 --> Porter

    Student --> P3
    P3 --> DB
    DB --> P3
    P3 --> Student

    Porter --> P4
    P4 --> DB
    DB --> P4
    P4 --> Porter

    Admin --> P5
    DB --> P5
    P5 --> Admin
```
