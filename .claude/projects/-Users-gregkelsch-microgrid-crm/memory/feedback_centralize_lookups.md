---
name: Centralize reference table lookups
description: Always use searchable dropdowns from reference tables (AHJs, utilities, etc.) instead of free text
type: feedback
---

Wherever a field maps to a reference table (AHJs, utilities, financiers, etc.), use searchable autocomplete dropdowns that pull from those tables — never free text. This applies across the entire platform: ProjectPanel, NewProjectModal, and any future forms.

**Why:** Prevents typos, ensures data consistency, and lets the reference tables be the single source of truth.

**How to apply:** When building any form with AHJ, Utility, or similar fields, use the AutocompleteInput/AutocompleteRow pattern that searches the reference table with `.ilike()` and shows suggestions.
