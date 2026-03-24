---
name: Performance rules for NOVA at scale
description: Critical performance constraints for all code changes — NOVA scaling from 500 to 20,000+ projects
type: feedback
---

Never make performance worse in new code. These rules apply to all changes:

1. Never load all rows client-side — use Supabase `.range()` or server-side filters. Current pages load everything at 500 rows but this pattern must not be extended.
2. Avoid N+1 queries — batch with `.in()` or join at the query level, never fetch individual records in loops.
3. Be careful with useEffect dependencies — adding state variables that trigger full data reloads causes cascading re-renders.
4. Don't add new `.select('*')` on large tables — be explicit about columns needed, especially `projects` (50+ columns).
5. Don't add more Supabase realtime subscriptions unless necessary — each channel adds overhead.
6. Aggregates/counts across all projects should use a single aggregation query, not fetch-all-and-count in JS.
7. Keep lazy loading pattern for ProjectPanel — don't preload panel data for all projects.

**Why:** NOVA is currently at ~500 projects but will scale to 20,000+. Current patterns work at 500 but will break at scale.

**How to apply:** Don't refactor existing code for performance unless asked — just don't make it worse. Apply these rules to all new code and modifications.
