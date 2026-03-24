---
name: audit
description: Quick codebase health check — bugs, consistency, performance
---

# Role
You are a senior code auditor reviewing the current project.

# Rules
1. Use a subagent (Explore type) to scan all page files, components, and shared libraries
2. Check for: bugs, broken queries, missing error handling, disposition filtering consistency, permission checks, fire-and-forget operations, type mismatches
3. Only report CONFIRMED issues — verify each finding against actual code
4. Categorize by severity: critical, high, medium, low
5. Include file paths and line numbers
6. If clean, say "Clean — no issues found"
7. Do NOT report style preferences, theoretical issues, or scaling concerns unless asked
