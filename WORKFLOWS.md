# NOVA CRM — Task Workflow Reference

Complete documentation of the NOVA CRM pipeline, task system, automation engine, and classification logic.

---

## Table of Contents

1. [Pipeline Overview](#1-pipeline-overview)
2. [Task Flow Diagrams](#2-task-flow-diagrams)
3. [Cross-Stage Dependencies](#3-cross-stage-dependencies)
4. [Automation Rules](#4-automation-rules)
5. [Disposition Flow](#5-disposition-flow)
6. [Funding Workflow](#6-funding-workflow)
7. [AHJ-Conditional Requirements](#7-ahj-conditional-requirements)
8. [Command Center Classification](#8-command-center-classification)
9. [Queue Section Logic](#9-queue-section-logic)
10. [Task Statuses and Reasons](#10-task-statuses-and-reasons)

---

## 1. Pipeline Overview

Projects move through 7 stages in order. Each stage has required and optional tasks. A stage auto-advances when all required tasks are marked Complete.

```mermaid
flowchart LR
    eval["Evaluation"]
    survey["Site Survey"]
    design["Design"]
    permit["Permitting"]
    install["Installation"]
    inspection["Inspection"]
    complete["Complete"]

    eval --> survey --> design --> permit --> install --> inspection --> complete

    style eval fill:#1a365d,stroke:#3182ce,color:#fff
    style survey fill:#1a365d,stroke:#3182ce,color:#fff
    style design fill:#1a365d,stroke:#3182ce,color:#fff
    style permit fill:#1a365d,stroke:#3182ce,color:#fff
    style install fill:#1a365d,stroke:#3182ce,color:#fff
    style inspection fill:#1a365d,stroke:#3182ce,color:#fff
    style complete fill:#065f46,stroke:#10b981,color:#fff
```

### Stage Summary

| Stage       | Display Name   | Required Tasks | Optional Tasks | SLA Target* | SLA Risk* | SLA Critical* |
|-------------|----------------|:--------------:|:--------------:|:-----------:|:---------:|:-------------:|
| evaluation  | Evaluation     | 5              | 0              | 3 days      | 4 days    | 6 days        |
| survey      | Site Survey    | 2              | 0              | 3 days      | 5 days    | 10 days       |
| design      | Design         | 5              | 7              | 3 days      | 5 days    | 10 days       |
| permit      | Permitting     | 5              | 1              | 21 days     | 30 days   | 45 days       |
| install     | Installation   | 3              | 1              | 5 days      | 7 days    | 10 days       |
| inspection  | Inspection     | 5              | 3              | 14 days     | 21 days   | 30 days       |
| complete    | Complete       | 2              | 0              | 3 days      | 5 days    | 7 days        |

\* SLA thresholds are currently paused (set to 999) pending funding. Original values shown above.

---

## 2. Task Flow Diagrams

### Evaluation Stage

All 5 tasks are independent (no prerequisites). They can be worked in any order.

```mermaid
flowchart TB
    subgraph EVALUATION["EVALUATION STAGE (all parallel)"]
        welcome["Welcome Call<br/><i>REQ</i>"]
        ia["IA Confirmation<br/><i>REQ</i>"]
        ub["UB Confirmation<br/><i>REQ</i>"]
        sched_survey["Schedule Site Survey<br/><i>REQ</i>"]
        ntp["NTP Procedure<br/><i>REQ</i>"]
    end

    sched_survey -. "unlocks" .-> next1(("Site Survey<br/>(survey stage)"))
    ntp -. "unlocks" .-> next2(("Check Point 1<br/>(permit stage)"))

    style welcome fill:#1e40af,stroke:#3b82f6,color:#fff
    style ia fill:#1e40af,stroke:#3b82f6,color:#fff
    style ub fill:#1e40af,stroke:#3b82f6,color:#fff
    style sched_survey fill:#1e40af,stroke:#3b82f6,color:#fff
    style ntp fill:#1e40af,stroke:#3b82f6,color:#fff
    style next1 fill:#374151,stroke:#6b7280,color:#9ca3af
    style next2 fill:#374151,stroke:#6b7280,color:#9ca3af
```

### Survey Stage

Linear chain. Site Survey requires Schedule Site Survey (from evaluation).

```mermaid
flowchart TB
    subgraph SURVEY["SURVEY STAGE"]
        prev(("Schedule Site Survey<br/>(eval, complete)")) --> site_survey["Site Survey<br/><i>REQ</i>"]
        site_survey --> survey_review["Survey Review<br/><i>REQ</i>"]
    end

    survey_review -. "unlocks" .-> next(("Build Design<br/>(design stage)"))

    style prev fill:#374151,stroke:#6b7280,color:#9ca3af
    style site_survey fill:#1e40af,stroke:#3b82f6,color:#fff
    style survey_review fill:#1e40af,stroke:#3b82f6,color:#fff
    style next fill:#374151,stroke:#6b7280,color:#9ca3af
```

### Design Stage

The most complex stage. Scope of Work is the main branching point.

```mermaid
flowchart TB
    subgraph DESIGN["DESIGN STAGE"]
        prev(("Survey Review<br/>(survey, complete)")) --> build_design["Build Design<br/><i>REQ</i>"]
        build_design --> scope["Scope of Work<br/><i>REQ</i>"]

        scope --> monitoring["Monitoring<br/><i>REQ</i>"]
        scope --> build_eng["Build Engineering<br/><i>REQ</i>"]
        build_eng --> eng_approval["Engineering Approval<br/><i>REQ</i>"]

        scope --> wp1["WP1<br/><i>OPT*</i>"]
        scope --> prod_add["Production Addendum<br/><i>OPT</i>"]
        scope --> new_ia["Create New IA<br/><i>OPT</i>"]
        scope --> reroof["Reroof Procedure<br/><i>OPT</i>"]
        scope --> onsite_redesign["OnSite Redesign<br/><i>OPT</i>"]
        scope --> quote_ext["Quote — Ext. Scope<br/><i>OPT</i>"]

        stamps["Stamps Required<br/><i>OPT (standalone)</i>"]
    end

    eng_approval -. "unlocks 4 permit tasks" .-> next(("Permit Stage"))

    style prev fill:#374151,stroke:#6b7280,color:#9ca3af
    style build_design fill:#1e40af,stroke:#3b82f6,color:#fff
    style scope fill:#1e40af,stroke:#3b82f6,color:#fff
    style monitoring fill:#1e40af,stroke:#3b82f6,color:#fff
    style build_eng fill:#1e40af,stroke:#3b82f6,color:#fff
    style eng_approval fill:#1e40af,stroke:#3b82f6,color:#fff
    style stamps fill:#4b5563,stroke:#9ca3af,color:#d1d5db
    style wp1 fill:#4b5563,stroke:#9ca3af,color:#d1d5db
    style prod_add fill:#4b5563,stroke:#9ca3af,color:#d1d5db
    style new_ia fill:#4b5563,stroke:#9ca3af,color:#d1d5db
    style reroof fill:#4b5563,stroke:#9ca3af,color:#d1d5db
    style onsite_redesign fill:#4b5563,stroke:#9ca3af,color:#d1d5db
    style quote_ext fill:#4b5563,stroke:#9ca3af,color:#d1d5db
    style next fill:#374151,stroke:#6b7280,color:#9ca3af
```

\* WP1 is required for Corpus Christi and Texas City AHJs.

### Permit Stage

Four tasks branch from Engineering Approval. Check Point 1 is a convergence gate.

```mermaid
flowchart TB
    subgraph PERMIT["PERMIT STAGE"]
        eng(("Engineering Approval<br/>(design, complete)")) --> hoa["HOA Approval<br/><i>REQ</i>"]
        eng --> om["OM Project Review<br/><i>REQ</i>"]
        eng --> city_permit["City Permit Approval<br/><i>REQ</i>"]
        eng --> util_permit["Utility Permit Approval<br/><i>REQ</i>"]

        ntp_done(("NTP Procedure<br/>(eval, complete)")) --> checkpoint1

        eng --> checkpoint1["Check Point 1<br/><i>REQ (convergence gate)</i>"]
        city_permit --> checkpoint1
        util_permit --> checkpoint1

        revise_ia["Revise IA<br/><i>OPT (standalone)</i>"]
    end

    checkpoint1 -. "unlocks" .-> next(("Schedule Install<br/>(install stage)"))

    style eng fill:#374151,stroke:#6b7280,color:#9ca3af
    style ntp_done fill:#374151,stroke:#6b7280,color:#9ca3af
    style hoa fill:#1e40af,stroke:#3b82f6,color:#fff
    style om fill:#1e40af,stroke:#3b82f6,color:#fff
    style city_permit fill:#1e40af,stroke:#3b82f6,color:#fff
    style util_permit fill:#1e40af,stroke:#3b82f6,color:#fff
    style checkpoint1 fill:#7c2d12,stroke:#ea580c,color:#fff
    style revise_ia fill:#4b5563,stroke:#9ca3af,color:#d1d5db
    style next fill:#374151,stroke:#6b7280,color:#9ca3af
```

Check Point 1 prerequisites (all 4 must be Complete):
- Engineering Approval (from design stage)
- City Permit Approval
- Utility Permit Approval
- NTP Procedure (from evaluation stage)

### Install Stage

Linear after Check Point 1, with one optional standalone task.

```mermaid
flowchart TB
    subgraph INSTALL["INSTALL STAGE"]
        cp1(("Check Point 1<br/>(permit, complete)")) --> sched_install["Schedule Installation<br/><i>REQ</i>"]
        sched_install --> inventory["Inventory Allocation<br/><i>REQ</i>"]
        sched_install --> install_done["Installation Complete<br/><i>REQ</i>"]

        elec_redesign["Electrical Onsite Redesign<br/><i>OPT (standalone)</i>"]
    end

    install_done -. "triggers M2 funding +<br/>unlocks inspection" .-> next(("Inspection Stage"))

    style cp1 fill:#374151,stroke:#6b7280,color:#9ca3af
    style sched_install fill:#1e40af,stroke:#3b82f6,color:#fff
    style inventory fill:#1e40af,stroke:#3b82f6,color:#fff
    style install_done fill:#1e40af,stroke:#3b82f6,color:#fff
    style elec_redesign fill:#4b5563,stroke:#9ca3af,color:#d1d5db
    style next fill:#374151,stroke:#6b7280,color:#9ca3af
```

### Inspection Stage

Two parallel tracks (city and utility) converge from Inspection Review.

```mermaid
flowchart TB
    subgraph INSPECTION["INSPECTION STAGE"]
        install(("Install Complete<br/>(install, complete)")) --> insp_review["Inspection Review<br/><i>REQ</i>"]

        insp_review --> sched_city["Schedule City Inspection<br/><i>REQ</i>"]
        sched_city --> city_insp["City Inspection<br/><i>REQ</i>"]

        insp_review --> sched_util["Schedule Utility Inspection<br/><i>REQ</i>"]
        sched_util --> util_insp["Utility Inspection<br/><i>REQ</i>"]

        insp_review --> city_upd["City Permit Update<br/><i>OPT</i>"]
        insp_review --> util_upd["Utility Permit Update<br/><i>OPT</i>"]

        install --> wpi28["WPI 2 & 8<br/><i>OPT*</i>"]
    end

    util_insp -. "unlocks" .-> next(("PTO<br/>(complete stage)"))

    style install fill:#374151,stroke:#6b7280,color:#9ca3af
    style insp_review fill:#1e40af,stroke:#3b82f6,color:#fff
    style sched_city fill:#1e40af,stroke:#3b82f6,color:#fff
    style city_insp fill:#1e40af,stroke:#3b82f6,color:#fff
    style sched_util fill:#1e40af,stroke:#3b82f6,color:#fff
    style util_insp fill:#1e40af,stroke:#3b82f6,color:#fff
    style city_upd fill:#4b5563,stroke:#9ca3af,color:#d1d5db
    style util_upd fill:#4b5563,stroke:#9ca3af,color:#d1d5db
    style wpi28 fill:#4b5563,stroke:#9ca3af,color:#d1d5db
    style next fill:#374151,stroke:#6b7280,color:#9ca3af
```

\* WPI 2 & 8 is required for Corpus Christi and Texas City AHJs.

### Complete Stage

Linear chain. Final two tasks close out the project.

```mermaid
flowchart TB
    subgraph COMPLETE["COMPLETE STAGE"]
        util_insp_done(("Utility Inspection<br/>(inspection, complete)")) --> pto["Permission to Operate<br/><i>REQ</i>"]
        pto --> in_service["In Service<br/><i>REQ</i>"]
    end

    pto -. "triggers M3 funding,<br/>sets pto_date" .-> funding(("M3 Eligible"))
    in_service -. "sets disposition<br/>to In Service" .-> disp(("In Service"))

    style util_insp_done fill:#374151,stroke:#6b7280,color:#9ca3af
    style pto fill:#1e40af,stroke:#3b82f6,color:#fff
    style in_service fill:#065f46,stroke:#10b981,color:#fff
    style funding fill:#374151,stroke:#6b7280,color:#9ca3af
    style disp fill:#374151,stroke:#6b7280,color:#9ca3af
```

---

## 3. Cross-Stage Dependencies

Tasks can depend on tasks from earlier stages. These cross-stage prerequisite links are:

```mermaid
flowchart LR
    subgraph EVAL["Evaluation"]
        sched_survey_e["Schedule Site Survey"]
        ntp_e["NTP Procedure"]
    end

    subgraph SURV["Survey"]
        site_survey_s["Site Survey"]
        survey_review_s["Survey Review"]
    end

    subgraph DES["Design"]
        build_design_d["Build Design"]
        scope_d["Scope of Work"]
        build_eng_d["Build Engineering"]
        eng_approval_d["Engineering Approval"]
    end

    subgraph PERM["Permit"]
        hoa_p["HOA Approval"]
        om_p["OM Project Review"]
        city_p["City Permit"]
        util_p["Utility Permit"]
        cp1_p["Check Point 1"]
    end

    subgraph INST["Install"]
        sched_inst_i["Schedule Install"]
        install_done_i["Install Complete"]
    end

    subgraph INSP["Inspection"]
        insp_review_n["Inspection Review"]
        sched_city_n["Sched City Insp"]
        sched_util_n["Sched Util Insp"]
        city_insp_n["City Inspection"]
        util_insp_n["Utility Inspection"]
        wpi28_n["WPI 2 & 8"]
    end

    subgraph COMP["Complete"]
        pto_c["PTO"]
        in_service_c["In Service"]
    end

    sched_survey_e --> site_survey_s --> survey_review_s --> build_design_d
    build_design_d --> scope_d --> build_eng_d --> eng_approval_d

    eng_approval_d --> hoa_p
    eng_approval_d --> om_p
    eng_approval_d --> city_p
    eng_approval_d --> util_p
    eng_approval_d --> cp1_p
    city_p --> cp1_p
    util_p --> cp1_p
    ntp_e --> cp1_p

    cp1_p --> sched_inst_i
    sched_inst_i --> install_done_i

    install_done_i --> insp_review_n
    install_done_i --> wpi28_n
    insp_review_n --> sched_city_n --> city_insp_n
    insp_review_n --> sched_util_n --> util_insp_n

    util_insp_n --> pto_c --> in_service_c
```

### Full End-to-End Critical Path

The longest prerequisite chain through the entire pipeline:

```mermaid
flowchart TB
    A["Schedule Site Survey<br/>(eval)"] --> B["Site Survey<br/>(survey)"]
    B --> C["Survey Review<br/>(survey)"]
    C --> D["Build Design<br/>(design)"]
    D --> E["Scope of Work<br/>(design)"]
    E --> F["Build Engineering<br/>(design)"]
    F --> G["Engineering Approval<br/>(design)"]
    G --> H["City Permit Approval<br/>(permit)"]
    G --> I["Utility Permit Approval<br/>(permit)"]
    H --> J["Check Point 1<br/>(permit)"]
    I --> J
    NTP["NTP Procedure<br/>(eval)"] --> J
    J --> K["Schedule Installation<br/>(install)"]
    K --> L["Installation Complete<br/>(install)"]
    L --> M["Inspection Review<br/>(inspection)"]
    M --> N["Schedule Util Inspection<br/>(inspection)"]
    N --> O["Utility Inspection<br/>(inspection)"]
    O --> P["PTO<br/>(complete)"]
    P --> Q["In Service<br/>(complete)"]

    M --> R["Schedule City Inspection<br/>(inspection)"]
    R --> S["City Inspection<br/>(inspection)"]

    style J fill:#7c2d12,stroke:#ea580c,color:#fff
    style Q fill:#065f46,stroke:#10b981,color:#fff
```

---

## 4. Automation Rules

When a task status changes, the following automations fire in the ProjectPanel component.

### Automation Chain

```mermaid
flowchart TB
    trigger["Task Marked Complete"] --> date["Auto-Set Project Date<br/>(TASK_DATE_FIELDS)"]
    date --> prereq["Check Prerequisites<br/>of Downstream Tasks"]
    prereq --> ready["Auto-Ready Downstream<br/>(all prereqs met = Ready To Start)"]
    ready --> check["Check Stage Advance<br/>(all REQ tasks Complete?)"]
    check -->|Yes| advance["Auto-Advance Stage<br/>+ Log to stage_history"]
    check -->|No| wait["Wait for remaining tasks"]
    trigger --> blocker_check{"Was task<br/>Pending Resolution?"}
    blocker_check -->|"Resolved"| clear["Clear project blocker<br/>(if no other stuck tasks)"]
    trigger --> funding_check{"Install Complete<br/>or PTO?"}
    funding_check -->|"Install Complete"| m2["Set M2 to Eligible"]
    funding_check -->|"PTO"| m3["Set M3 to Eligible"]
    trigger --> inservice{"In Service task?"}
    inservice -->|Yes| disp["Set disposition = In Service"]

    style trigger fill:#065f46,stroke:#10b981,color:#fff
    style advance fill:#1e40af,stroke:#3b82f6,color:#fff
    style m2 fill:#7c2d12,stroke:#ea580c,color:#fff
    style m3 fill:#7c2d12,stroke:#ea580c,color:#fff
    style disp fill:#065f46,stroke:#10b981,color:#fff
```

### Revision Cascade

```mermaid
flowchart TB
    trigger["Task Set to<br/>Revision Required"] --> confirm["Confirmation Dialog<br/>(lists affected tasks)"]
    confirm --> cascade["BFS: Find All Same-Stage<br/>Downstream Tasks"]
    cascade --> reset["Reset Downstream to Not Ready"]
    reset --> dates["Clear Auto-Populated Dates<br/>(TASK_DATE_FIELDS)"]
    dates --> stop["Stop at Stage Boundary<br/>(no cross-stage cascade)"]

    style trigger fill:#92400e,stroke:#f59e0b,color:#fff
    style reset fill:#991b1b,stroke:#ef4444,color:#fff
```

### 4.1 Auto-Populate Project Dates (TASK_DATE_FIELDS)

When a task is marked **Complete**, the corresponding project date field is automatically set to today's date.

| Task ID         | Task Name                | Project Date Field Set       |
|-----------------|--------------------------|------------------------------|
| `ntp`           | NTP Procedure            | `ntp_date`                   |
| `sched_survey`  | Schedule Site Survey     | `survey_scheduled_date`      |
| `site_survey`   | Site Survey              | `survey_date`                |
| `city_permit`   | City Permit Approval     | `city_permit_date`           |
| `util_permit`   | Utility Permit Approval  | `utility_permit_date`        |
| `sched_install` | Schedule Installation    | `install_scheduled_date`     |
| `install_done`  | Installation Complete    | `install_complete_date`      |
| `city_insp`     | City Inspection          | `city_inspection_date`       |
| `util_insp`     | Utility Inspection       | `utility_inspection_date`    |
| `pto`           | Permission to Operate    | `pto_date`                   |
| `in_service`    | In Service               | `in_service_date`            |

### 4.2 Auto-Advance Stage

When the **last required task** in a stage is marked Complete, the project automatically advances to the next pipeline stage. The transition is logged to the `stage_history` table.

Stage advancement order:
```mermaid
flowchart LR
    E["evaluation"] --> S["survey"] --> D["design"] --> P["permit"] --> I["install"] --> N["inspection"] --> C["complete"]
```

Only **required** tasks count toward stage advancement. Optional tasks do not block stage progression.

### 4.3 Auto-Detect Blockers

- When any task enters **Pending Resolution**, the project's `blocker` field is auto-set to the task's `reason` (prefixed with a pause icon).
- When that stuck task is resolved (status changes away from Pending Resolution), the blocker is auto-cleared — but **only if no other tasks remain stuck** on that project.
- A project with a non-null `blocker` field appears in the Blocked section across the CRM.

### 4.4 Funding Milestone Triggers

| Task Completion          | Funding Action                                            |
|--------------------------|-----------------------------------------------------------|
| Installation Complete    | Sets M2 milestone to **Eligible**. Creates funding record if none exists. |
| Permission to Operate    | Sets M3 milestone to **Eligible**. Creates funding record if none exists. |

### 4.5 Task Duration Tracking

- When a task moves to **In Progress**, `started_date` is automatically set on the task_state record.
- When a task moves to **Complete**, duration is calculated from `started_date` to completion.

### 4.6 Revision Cascade

When a task is set to **Revision Required**:

1. A confirmation dialog is shown listing all downstream tasks that will be reset.
2. All **same-stage downstream tasks** (found via BFS through the prerequisite chain) are reset to **Not Ready**.
3. Corresponding auto-populated dates (from TASK_DATE_FIELDS) are **cleared** for all cascaded tasks.
4. The cascade is limited to the same stage — it does not cross stage boundaries.

Example: Setting `build_design` to Revision Required in the design stage cascades to:

```mermaid
flowchart TB
    bd["build_design<br/><b>Revision Required</b>"] --> scope["scope → Not Ready"]
    scope --> monitoring["monitoring → Not Ready"]
    scope --> build_eng["build_eng → Not Ready"]
    build_eng --> eng_approval["eng_approval → Not Ready"]
    scope --> wp1["wp1 → Not Ready"]
    scope --> prod_add["prod_add → Not Ready"]
    scope --> new_ia["new_ia → Not Ready"]
    scope --> reroof["reroof → Not Ready"]
    scope --> onsite_redesign["onsite_redesign → Not Ready"]
    scope --> quote_ext["quote_ext_scope → Not Ready"]

    style bd fill:#92400e,stroke:#f59e0b,color:#fff
    style scope fill:#991b1b,stroke:#ef4444,color:#fff
    style monitoring fill:#991b1b,stroke:#ef4444,color:#fff
    style build_eng fill:#991b1b,stroke:#ef4444,color:#fff
    style eng_approval fill:#991b1b,stroke:#ef4444,color:#fff
    style wp1 fill:#991b1b,stroke:#ef4444,color:#fff
    style prod_add fill:#991b1b,stroke:#ef4444,color:#fff
    style new_ia fill:#991b1b,stroke:#ef4444,color:#fff
    style reroof fill:#991b1b,stroke:#ef4444,color:#fff
    style onsite_redesign fill:#991b1b,stroke:#ef4444,color:#fff
    style quote_ext fill:#991b1b,stroke:#ef4444,color:#fff
```

### 4.7 Auto-Set In Service Disposition

When the **In Service** task is marked Complete, the project's `disposition` field is automatically set to `'In Service'`.

### 4.8 Prerequisite Unlocking

When a task is marked Complete, all tasks that list it as a prerequisite become eligible for **Ready To Start** status (provided all of their other prerequisites are also Complete).

---

## 5. Disposition Flow

Projects have a `disposition` field that controls their visibility and classification across the CRM.

```mermaid
stateDiagram-v2
    state "null / Sale\n(Active Pipeline)" as Sale
    state "Loyalty\n(still active, managed by PM)" as Loyalty
    state "Cancelled\n(dead)" as Cancelled
    state "In Service\n(closed)" as InService

    [*] --> Sale : New project created

    Sale --> Loyalty : Manual change
    Loyalty --> Sale : Manual change

    Sale --> Cancelled : Manual change
    Cancelled --> Sale : Manual change
    Loyalty --> Cancelled : Manual change
    Cancelled --> Loyalty : Manual change

    Sale --> InService : Auto: In Service task completes
    InService --> Sale : Manual change

    note right of InService : Auto-set when In Service\ntask is marked Complete
```

### Disposition Visibility by Page

| Page       | null/Sale | Loyalty   | In Service | Cancelled |
|------------|:---------:|:---------:|:----------:|:---------:|
| Command    | Active    | Separate section | Separate section | Hidden |
| Pipeline   | Shown     | Hidden    | Hidden     | Hidden    |
| Queue      | Shown     | Separate section | Hidden | Hidden |
| Analytics  | Shown     | Hidden    | Hidden     | Hidden    |
| Funding    | Shown     | Hidden    | Hidden     | Hidden    |
| Audit      | Shown     | Shown     | Hidden     | Hidden    |

Key: Loyalty projects appear in Queue and Audit because PMs still actively manage them.

---

## 6. Funding Workflow

Each project can have up to 3 funding milestones (M1, M2, M3) tracked in the `project_funding` table.

### Milestone Flow

```mermaid
stateDiagram-v2
    state "Not Set" as NotSet
    state "Eligible" as Eligible
    state "Ready To Start" as Ready
    state "Submitted" as Submitted
    state "Funded" as Funded
    state "Pending Resolution" as Pending
    state "Revision Required" as Revision

    [*] --> NotSet
    NotSet --> Eligible : Auto-trigger\n(Install Complete → M2)\n(PTO → M3)
    Eligible --> Ready : Manual
    Ready --> Submitted : Manual
    Submitted --> Funded : Manual
    Submitted --> Pending : Issue found
    Pending --> Submitted : Resolved
    Submitted --> Revision : Rework needed
    Revision --> Submitted : Rework complete
```

### Automatic Milestone Triggers

```mermaid
flowchart LR
    install["Installation Complete<br/>task marked Complete"] --> m2["M2 Milestone<br/>set to Eligible"]
    pto["Permission to Operate<br/>task marked Complete"] --> m3["M3 Milestone<br/>set to Eligible"]

    style install fill:#1e40af,stroke:#3b82f6,color:#fff
    style pto fill:#1e40af,stroke:#3b82f6,color:#fff
    style m2 fill:#065f46,stroke:#10b981,color:#fff
    style m3 fill:#065f46,stroke:#10b981,color:#fff
```

M1 is not auto-triggered — it is managed manually.

### Funding Record Fields

Each milestone record includes:
- Milestone amount
- Milestone date (when funded)
- CB (clawback) credit amount
- Status tracking

---

## 7. AHJ-Conditional Requirements

Some tasks are normally optional but become **required** when the project's AHJ (Authority Having Jurisdiction) matches specific cities.

| Task ID  | Task Name  | Normally | Required When AHJ Is             |
|----------|------------|:--------:|----------------------------------|
| `wp1`    | WP1        | Optional | **Corpus Christi** or **Texas City** |
| `wpi28`  | WPI 2 & 8  | Optional | **Corpus Christi** or **Texas City** |

### How It Works

The `isTaskRequired()` function checks:
1. If the task is already marked `req: true`, it is always required.
2. If the task ID appears in `AHJ_REQUIRED_TASKS`, the project's AHJ is matched (case-insensitive, prefix match).
3. When a task becomes conditionally required, it blocks stage advancement just like any other required task.

### Impact on Stage Advancement

- **Design stage**: If AHJ is Corpus Christi or Texas City, WP1 must be Complete (along with all other required tasks) before the stage advances.
- **Inspection stage**: If AHJ is Corpus Christi or Texas City, WPI 2 & 8 must be Complete before the stage advances.

---

## 8. Command Center Classification

The Command Center (`/command`) classifies projects into sections using this priority-ordered logic. A project appears in the **first** matching section only (except Aging, which can overlap).

### Classification Priority Order

```mermaid
flowchart TB
    start(("Project")) --> disp{"Disposition?"}

    disp -->|"In Service"| is["In Service Section"]
    disp -->|"Loyalty"| loy["Loyalty Section"]
    disp -->|"Cancelled"| excl["Excluded Entirely"]
    disp -->|"null / Sale"| overdue{"Has overdue<br/>tasks?"}

    overdue -->|Yes| od["1. OVERDUE"]
    overdue -->|No| blocked{"blocker<br/>non-null?"}

    blocked -->|Yes| bl["2. BLOCKED"]
    blocked -->|No| pending{"Tasks in Pending<br/>Resolution?"}

    pending -->|Yes| pr["3. PENDING RESOLUTION"]
    pending -->|No| crit{"Days in stage<br/>>= critical SLA?"}

    crit -->|Yes| cr["4. CRITICAL"]
    crit -->|No| risk{"Days in stage<br/>>= risk SLA?"}

    risk -->|Yes| ar["5. AT RISK"]
    risk -->|No| stall{"5+ days in stage,<br/>no movement?"}

    stall -->|Yes| st["6. STALLED"]
    stall -->|No| ot["7. ON TRACK"]

    start --> aging{"Cycle days<br/>>= 90?"}
    aging -->|Yes| ag["8. AGING<br/>(can overlap)"]

    style od fill:#991b1b,stroke:#ef4444,color:#fff
    style bl fill:#991b1b,stroke:#ef4444,color:#fff
    style pr fill:#991b1b,stroke:#ef4444,color:#fff
    style cr fill:#991b1b,stroke:#ef4444,color:#fff
    style ar fill:#92400e,stroke:#f59e0b,color:#fff
    style st fill:#92400e,stroke:#f59e0b,color:#fff
    style ag fill:#4b5563,stroke:#9ca3af,color:#d1d5db
    style ot fill:#065f46,stroke:#10b981,color:#fff
    style is fill:#1e40af,stroke:#3b82f6,color:#fff
    style loy fill:#1e40af,stroke:#3b82f6,color:#fff
    style excl fill:#374151,stroke:#6b7280,color:#9ca3af
```

### SLA Calculation

```
Days in stage = daysAgo(project.stage_date)

If days >= crit threshold  -->  "crit"
If days >= risk threshold  -->  "risk"
Otherwise                  -->  "ok"
```

### Helper Functions

- `cycleDays(p)` = `daysAgo(p.sale_date) || daysAgo(p.stage_date)` — total project age
- `isBlocked(p)` = `!!p.blocker`
- `isStalled(p)` = not blocked AND `daysAgo(p.stage_date) >= 5`

---

## 9. Queue Section Logic

The Queue page (`/queue`) shows a PM-filtered project list organized into task-based sections.

### Exclusions

- **In Service** and **Cancelled** dispositions are excluded entirely.
- **Loyalty** projects get their own separate collapsible section.

### Section Classification

```mermaid
flowchart TB
    project(("Project")) --> followup{"follow_up_date<br/>today or past?"}
    followup -->|Yes| fu["Follow-Ups<br/>(can overlap with any section)"]

    project --> disp{"Disposition?"}
    disp -->|"In Service / Cancelled"| excluded["Excluded"]
    disp -->|"Loyalty"| loyalty["Loyalty Section"]
    disp -->|"null / Sale"| stage{"stage = complete?"}

    stage -->|Yes| comp["Complete Section"]
    stage -->|No| cp{"city_permit task<br/>status?"}

    cp -->|"Ready To Start"| cp_ready["City Permit — Ready"]
    cp -->|"In Progress / Scheduled /<br/>Pending / Revision"| cp_sub["City Permit — Submitted"]
    cp -->|Other| up{"util_permit task<br/>status?"}

    up -->|"In Progress / Scheduled /<br/>Pending / Revision"| up_sub["Utility Permit — Submitted"]
    up -->|Other| ui{"util_insp task<br/>status?"}

    ui -->|"Ready To Start"| ui_ready["Utility Inspection — Ready"]
    ui -->|"In Progress / Scheduled /<br/>Pending / Revision"| ui_sub["Utility Inspection — Submitted"]
    ui -->|Other| blocked{"blocker<br/>non-null?"}

    blocked -->|Yes| bl["Blocked Section"]
    blocked -->|No| active["Active Section"]

    style fu fill:#1e40af,stroke:#3b82f6,color:#fff
    style excluded fill:#374151,stroke:#6b7280,color:#9ca3af
    style loyalty fill:#4b5563,stroke:#9ca3af,color:#d1d5db
    style comp fill:#065f46,stroke:#10b981,color:#fff
    style cp_ready fill:#92400e,stroke:#f59e0b,color:#fff
    style cp_sub fill:#92400e,stroke:#f59e0b,color:#fff
    style up_sub fill:#92400e,stroke:#f59e0b,color:#fff
    style ui_ready fill:#92400e,stroke:#f59e0b,color:#fff
    style ui_sub fill:#92400e,stroke:#f59e0b,color:#fff
    style bl fill:#991b1b,stroke:#ef4444,color:#fff
    style active fill:#1e40af,stroke:#3b82f6,color:#fff
```

### Section Definitions

| Section                     | Filter Logic                                                     |
|-----------------------------|------------------------------------------------------------------|
| **Follow-Ups**              | Project or task `follow_up_date` is today or overdue (past).     |
| **City Permit — Ready**     | `city_permit` task status = `Ready To Start`, not complete stage. |
| **City Permit — Submitted** | `city_permit` task status is In Progress, Scheduled, Pending Resolution, or Revision Required. Not complete stage. |
| **Utility Permit — Submitted** | `util_permit` task status is In Progress, Scheduled, Pending Resolution, or Revision Required. Not complete stage. |
| **Utility Inspection — Ready** | `util_insp` task status = `Ready To Start`, not complete stage. |
| **Utility Inspection — Submitted** | `util_insp` task status is In Progress, Scheduled, Pending Resolution, or Revision Required. Not complete stage. |
| **Blocked**                 | Project has a non-null `blocker` field.                          |
| **Active**                  | Everything not in any special section above, and not complete.   |
| **Loyalty**                 | `disposition = 'Loyalty'` (separate section).                    |
| **Complete**                | `stage = 'complete'`.                                            |

### Section Overlap Rules

- A project **can** appear in both **Blocked** and a task-based section (e.g., City Permit Submitted + Blocked). The Blocked section does not exclude projects from task sections.
- A project in a task-based section (City Permit, Utility Permit, Utility Inspection) is **excluded** from the Active section.
- Follow-Ups is computed independently and can overlap with any section.

### Sort Priority

Projects within each section are sorted by a priority function that weights stage position and SLA status.

---

## 10. Task Statuses and Reasons

### Status Progression

```mermaid
stateDiagram-v2
    state "Not Ready" as NR
    state "Ready To Start" as RTS
    state "In Progress" as IP
    state "Scheduled" as SCH
    state "Pending Resolution" as PR
    state "Revision Required" as RR
    state "Complete" as COMP

    [*] --> NR
    NR --> RTS : Prerequisites met
    RTS --> IP : Work begins
    IP --> COMP : Work finished
    IP --> SCH : Date set
    SCH --> COMP : Executed
    IP --> PR : Issue found\n(auto-sets blocker)
    PR --> IP : Issue resolved
    IP --> RR : Rework needed\n(cascades downstream)

    note right of PR : Auto-sets project.blocker\nto task reason
    note right of RR : Resets all same-stage\ndownstream tasks to Not Ready
```

### Status Descriptions

| Status              | Meaning                                                  | UI Color    |
|---------------------|----------------------------------------------------------|-------------|
| Not Ready           | Prerequisites not met, cannot be started                 | Gray        |
| Ready To Start      | All prerequisites complete, waiting to begin             | Light gray  |
| In Progress         | Actively being worked                                    | Blue        |
| Scheduled           | Date/time set for execution                              | Indigo      |
| Pending Resolution  | Blocked by an issue requiring resolution                 | Red         |
| Revision Required   | Needs rework, cascades downstream tasks to Not Ready     | Amber       |
| Complete            | Done                                                     | Green       |

### Pending Resolution Reasons (by Task)

Each task has a curated list of Pending Resolution reasons. Selected examples:

**Evaluation tasks:**
- Welcome Call: Credit Declined, Customer Unresponsive, Pending Cancellation, etc.
- IA Confirmation: Incorrect info (email/name/phone/price), Missing Document, Not Signed
- NTP Procedure: IA Resign, Missing Utility Bill, NTP Not Granted, Pending HCO/NCCO

**Design tasks:**
- Build Design: Extended Scope of Work, MPU Review, Pending DQ, Requires Table Discussion
- Engineering Approval: Battery Review, Missing Document/Photos, Sent for Stamps

**Permit tasks:**
- City Permit: Open Permits, Pending Engineering Revision, Pending HOA Approval
- Utility Permit: Duplicate Under Review, Pending ICA/PTO, Pending Utility Reply
- Check Point 1: Contract Issues, Credit Expired, Inventory Shortages, Need Reroof

**Inspection tasks:**
- City/Utility Inspection scheduling: Install Incomplete, Pending Corrections, Pending Service

**Complete tasks:**
- PTO: Pending PTO Issuance
- In Service: Battery Issues, CT Issues, Gateway Not Reporting, System Activation Incomplete

### Revision Required Reasons (by Stage)

Each stage has a curated list of Revision Required reasons. Selected examples:

- **Evaluation**: Incorrect Customer Info, Need New IA, PPW Too High
- **Survey**: Customer Postponed, Missing Photos (attic/drone/electrical/roof)
- **Design**: AHJ Correction, Battery Addition, Panel Count/Type Change, Utility Correction
- **Permit**: City/Utility Permit Revision, Incorrect Data on Plans, Reroof Discovered
- **Install**: Customer Canceled/Reschedule, Missing Material, Weather, OSR Required
- **Inspection**: Correction Needed, Grounding issues, Install Not Matching Plans, Workmanship
- **Complete**: Need PTO Letter, Tech Required

---

## Appendix: Complete Task Reference

### All Tasks with IDs, Prerequisites, and Requirements

| Stage      | Task ID           | Task Name                   | Prerequisites                               | Req? |
|------------|-------------------|-----------------------------|---------------------------------------------|:----:|
| evaluation | `welcome`         | Welcome Call                | (none)                                      | Yes  |
| evaluation | `ia`              | IA Confirmation             | (none)                                      | Yes  |
| evaluation | `ub`              | UB Confirmation             | (none)                                      | Yes  |
| evaluation | `sched_survey`    | Schedule Site Survey        | (none)                                      | Yes  |
| evaluation | `ntp`             | NTP Procedure               | (none)                                      | Yes  |
| survey     | `site_survey`     | Site Survey                 | `sched_survey`                              | Yes  |
| survey     | `survey_review`   | Survey Review               | `site_survey`                               | Yes  |
| design     | `build_design`    | Build Design                | `survey_review`                             | Yes  |
| design     | `scope`           | Scope of Work               | `build_design`                              | Yes  |
| design     | `monitoring`      | Monitoring                  | `scope`                                     | Yes  |
| design     | `build_eng`       | Build Engineering           | `scope`                                     | Yes  |
| design     | `eng_approval`    | Engineering Approval        | `build_eng`                                 | Yes  |
| design     | `stamps`          | Stamps Required             | (none)                                      | No   |
| design     | `wp1`             | WP1                         | `scope`                                     | No*  |
| design     | `prod_add`        | Production Addendum         | `scope`                                     | No   |
| design     | `new_ia`          | Create New IA               | `scope`                                     | No   |
| design     | `reroof`          | Reroof Procedure            | `scope`                                     | No   |
| design     | `onsite_redesign` | OnSite Redesign             | `scope`                                     | No   |
| design     | `quote_ext_scope` | Quote — Extended Scope      | `scope`                                     | No   |
| permit     | `hoa`             | HOA Approval                | `eng_approval`                              | Yes  |
| permit     | `om_review`       | OM Project Review           | `eng_approval`                              | Yes  |
| permit     | `city_permit`     | City Permit Approval        | `eng_approval`                              | Yes  |
| permit     | `util_permit`     | Utility Permit Approval     | `eng_approval`                              | Yes  |
| permit     | `checkpoint1`     | Check Point 1               | `eng_approval`, `city_permit`, `util_permit`, `ntp` | Yes  |
| permit     | `revise_ia`       | Revise IA                   | (none)                                      | No   |
| install    | `sched_install`   | Schedule Installation       | `checkpoint1`                               | Yes  |
| install    | `inventory`       | Inventory Allocation        | `sched_install`                             | Yes  |
| install    | `install_done`    | Installation Complete       | `sched_install`                             | Yes  |
| install    | `elec_redesign`   | Electrical Onsite Redesign  | (none)                                      | No   |
| inspection | `insp_review`     | Inspection Review           | `install_done`                              | Yes  |
| inspection | `sched_city`      | Schedule City Inspection    | `insp_review`                               | Yes  |
| inspection | `sched_util`      | Schedule Utility Inspection | `insp_review`                               | Yes  |
| inspection | `city_insp`       | City Inspection             | `sched_city`                                | Yes  |
| inspection | `util_insp`       | Utility Inspection          | `sched_util`                                | Yes  |
| inspection | `city_upd`        | City Permit Update          | `insp_review`                               | No   |
| inspection | `util_upd`        | Utility Permit Update       | `insp_review`                               | No   |
| inspection | `wpi28`           | WPI 2 & 8                   | `install_done`                              | No*  |
| complete   | `pto`             | Permission to Operate       | `util_insp`                                 | Yes  |
| complete   | `in_service`      | In Service                  | `pto`                                       | Yes  |

\* Required for Corpus Christi and Texas City AHJs.

---

*Generated for the NOVA CRM team. Source of truth: `lib/tasks.ts`, `lib/utils.ts`, `app/command/page.tsx`, `app/queue/page.tsx`.*
