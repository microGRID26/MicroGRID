---
name: Roles and permissions — implemented
description: Role system is live. Five roles with permission matrix. Reference for future permission decisions.
type: project
---

**Status:** Implemented in Session 10 (2026-03-19). Migration `supabase/010-roles.sql` deployed to production.

**Roles (in order of access):**
- Super Admin (level 5) — Greg Kelsch only
- Admin (level 4) — Heidi Hildreth, Will Carter
- Finance (level 3) — Taylor Pratt
- Manager (level 2) — none assigned yet
- User (level 1) — Ari Ruelas, Jen Harper, Zach Hall, Mark Bench

**Permissions:**

| Action | Who can do it |
|--------|--------------|
| Delete projects | Super Admin only |
| Cancel/reactivate projects | Admin+ |
| Create projects | Admin+ |
| Delete AHJs/Utilities | Super Admin only |
| Edit AHJs/Utilities | Admin+ |
| Edit SLA thresholds | Admin+ |
| Manage users/crews | Admin+ |
| Access admin portal | Admin+ |
| Edit own projects | PM who owns project |
| Read all data | All authenticated |

**Implementation:**
- `role` column on `users` table (replaces old `admin`/`super_admin` booleans, kept for backward compat)
- `useCurrentUser()` hook returns `role`, `isAdmin`, `isSuperAdmin`, `isFinance`, `isManager`
- RLS functions `auth_is_admin()`, `auth_is_super_admin()`, `auth_user_role()` check `role` column
- Admin nav link hidden for non-admins
- Users module in admin portal has role dropdown

**Planned — Sales role:**
- New role below User (level 0 or 1) — can only see/access their own projects, not the full pipeline
- Use case: sales reps who submit projects but shouldn't see other reps' data
- Will need filtered queries and UI gating based on ownership (advisor or consultant field, TBD)

**How to apply:** When adding new permission-gated features, use the computed helpers from `useCurrentUser()`. Add new permissions to this table.
