---
name: Maximize front-end user control
description: Design principle — give users role-based control to configure their own workflows, minimize hardcoded values
type: feedback
---

Always design with the goal of giving end users more front-end control. The more they can configure the things they work on daily (based on their role), the less we have to hardcode.

**Why:** Reduces dependency on dev for changes, empowers users, and scales better as the team grows. Greg doesn't want to be the bottleneck for every dropdown value or configuration change.

**How to apply:** When building any feature, ask: "Can this be a reference table the user manages instead of a hardcoded list?" Examples: financiers, dealers, equipment models, NF codes, task definitions, SLA thresholds. Use admin-managed tables with autocomplete dropdowns instead of hardcoded options. Role-based permissions determine who can edit what.
