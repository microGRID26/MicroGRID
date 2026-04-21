-- 136-users-active-not-null.sql
-- ============================================================================
-- Close greg_actions #143 — belt-and-suspenders failsafe on users.active.
--
-- Context:
--   Migration 130 gates all RLS helpers on `COALESCE(u.active, true) = true`
--   — i.e. NULL is treated as active, the OPPOSITE of failsafe. Red-team
--   flagged this as Medium during the #138 audit. Exploitation requires a
--   users row where active IS NULL, which today is zero (verified
--   2026-04-21: total=19, null_active=0, inactive=7, active=12).
--
--   provision_user inserts with active=true explicitly, so the NULL case
--   only shows up if a future migration / CSV import / direct SQL INSERT
--   skips the column. DEFAULT is already 'true' at the column level, so
--   OMITTED inserts get true, but EXPLICIT NULL inserts pass through.
--
-- Fix: add NOT NULL to the column. DEFAULT already true (verified via
-- information_schema). Prevents any future caller from inserting NULL
-- and silently granting access via the COALESCE fallback.
-- ============================================================================

ALTER TABLE public.users ALTER COLUMN active SET NOT NULL;

COMMENT ON COLUMN public.users.active IS
  'Whether the user account is active. NOT NULL + DEFAULT true (migration 136) so future inserts cannot bypass the active-gated RLS helpers via NULL. See greg_actions #143.';
