-- Migration 162 — Helper RPC for monthly anon-user cleanup cron (#275).
-- Lists anon auth.users with no recent sign-in AND no feedback activity.
-- The cron route (MG /api/cron/anon-user-cleanup) calls this, iterates, and
-- deletes each via supabase.auth.admin.deleteUser() — Supabase's blessed path
-- for auth.users mutation, which keeps raw DELETE on auth.users out of SQL.
--
-- Rationale: post-Apr-2024 Supabase bills anonymous users as MAU. Each
-- SPOKE / bread-of-life install creates one anon auth.users row on first
-- feedback submit; with no cleanup, auth.users bloats + MAU climbs for
-- no reason. Users referenced by a stored spoke_feedback or
-- bread_of_life_feedback row are preserved regardless of age — they still
-- own attribution on a real piece of content.

CREATE OR REPLACE FUNCTION public.atlas_list_stale_anon_users(
  p_min_idle_days int DEFAULT 90
) RETURNS TABLE (id uuid, last_sign_in_at timestamptz)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT u.id, u.last_sign_in_at
    FROM auth.users u
   WHERE u.is_anonymous = true
     AND (u.last_sign_in_at IS NULL OR u.last_sign_in_at < now() - make_interval(days => p_min_idle_days))
     AND NOT EXISTS (
       SELECT 1 FROM public.spoke_feedback sf WHERE sf.submitter_uid = u.id
     )
     AND NOT EXISTS (
       SELECT 1 FROM public.bread_of_life_feedback b WHERE b.submitter_uid = u.id
     )
   ORDER BY u.last_sign_in_at NULLS FIRST
   LIMIT 500;  -- safety cap per run; cron re-fires monthly if more remain
$$;

REVOKE EXECUTE ON FUNCTION public.atlas_list_stale_anon_users(int) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.atlas_list_stale_anon_users(int) FROM anon;
REVOKE EXECUTE ON FUNCTION public.atlas_list_stale_anon_users(int) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.atlas_list_stale_anon_users(int) TO   service_role;

-- Per-id recheck used by the cron route to close the read-then-delete race
-- (R1 M1). A feedback insert landing between atlas_list_stale_anon_users and
-- the auth.admin.deleteUser call would otherwise orphan submitter_uid on a
-- fresh row. The cron re-evaluates this per candidate immediately before
-- deleting, so any window of newly-created feedback aborts the delete.
CREATE OR REPLACE FUNCTION public.atlas_anon_user_still_stale(
  p_id uuid,
  p_min_idle_days int DEFAULT 90
) RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users u
     WHERE u.id = p_id
       AND u.is_anonymous = true
       AND (u.last_sign_in_at IS NULL OR u.last_sign_in_at < now() - make_interval(days => p_min_idle_days))
       AND NOT EXISTS (SELECT 1 FROM public.spoke_feedback sf WHERE sf.submitter_uid = u.id)
       AND NOT EXISTS (SELECT 1 FROM public.bread_of_life_feedback b WHERE b.submitter_uid = u.id)
  );
$$;

REVOKE EXECUTE ON FUNCTION public.atlas_anon_user_still_stale(uuid, int) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.atlas_anon_user_still_stale(uuid, int) FROM anon;
REVOKE EXECUTE ON FUNCTION public.atlas_anon_user_still_stale(uuid, int) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.atlas_anon_user_still_stale(uuid, int) TO   service_role;
