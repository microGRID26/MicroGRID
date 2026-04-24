-- Migration 156 — Helper RPC for the auth_* grant-parity CI check.
--
-- Ships the single RPC that scripts/check-auth-grant-parity.py calls. The
-- script is insurance against the 2026-04-24 outage class (migration 151
-- context): a single auth_* helper losing its anon grant silently takes out
-- 155 RLS policies.
--
-- Returns one row per function in the public schema whose name starts with
-- `auth_`, with boolean columns for EXECUTE privilege on anon / authenticated
-- / public. The CI script POSTs here with service_role and asserts all three
-- booleans are true for every helper.
--
-- SECURITY INVOKER intentionally: service_role has full introspection on
-- pg_proc and has_function_privilege() works for any caller against any role.
-- No need for SECURITY DEFINER and the search_path + revoke dance.
--
-- Grant-guard hook compliance: revoke PUBLIC (CREATE FUNCTION default);
-- grant EXECUTE to service_role only. anon + authenticated should never
-- reach this — it's an audit RPC, not a product surface.

CREATE OR REPLACE FUNCTION public.atlas_check_auth_grants()
RETURNS TABLE (
  proname text,
  anon_exec boolean,
  authenticated_exec boolean,
  public_exec boolean
)
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $function$
  SELECT
    p.proname::text,
    has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_exec,
    has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_exec,
    has_function_privilege('public', p.oid, 'EXECUTE') AS public_exec
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname LIKE 'auth\_%' ESCAPE '\'
  ORDER BY p.proname;
$function$;

REVOKE EXECUTE ON FUNCTION public.atlas_check_auth_grants() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.atlas_check_auth_grants() TO service_role;
