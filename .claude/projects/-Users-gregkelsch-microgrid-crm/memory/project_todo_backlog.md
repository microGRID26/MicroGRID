---
name: Feature backlog
description: Deferred features and data cleanup tasks identified during sessions
type: project
---

**Dropdown/table migrations needed:**
- Dealer field -> needs its own reference table with autocomplete
- Financier -> dropdown or reference table (at minimum a dropdown)
- Module, Inverter, Battery -> dropdowns or reference tables for equipment models
- Energy Advisor, Consultant -> should come from users table or reference table

**Data cleanup:**
- Scan AHJs table for duplicates (e.g., "Centerpoint" vs "Centerpoint Energy Houston Electric LLC" are the same)
- Scan Utilities table for same duplicate issue
- "EDGE" must be capitalized everywhere on the website and in all data going forward

**UI polish:**
- Show $ sign prefix on all currency inputs and displays across the platform
- Mobile responsive pass

**Why:** Greg identified these during sessions. These are quality-of-life improvements that prevent data inconsistency as more users onboard.

**How to apply:** Tackle these as discrete tasks. The reference table migrations (dealer, financier, equipment) are medium effort each. The AHJ/Utility dedup is a one-time data cleanup + merge operation.
