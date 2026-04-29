-- 199-atlas-list-null-bypass-policies.sql
-- Closes greg_actions #395.
-- Helper RPC for the CI check `scripts/check-no-null-bypass.py`. Returns any
-- pg_catalog.pg_policies row whose USING or WITH CHECK clause text contains the
-- regex `org_id\s+is\s+null` (case-insensitive). Phase 3 (mig 193) rewrote the
-- 53 v2 policies that had this clause; this RPC + the script catch any future
-- regression.
--
-- Owner-only. Returns no rows in current state — that's the contract.

CREATE OR REPLACE FUNCTION public.atlas_list_null_bypass_policies()
RETURNS TABLE (schemaname text, tablename text, policyname text, qual_clause text, with_check_clause text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public', 'pg_catalog', 'pg_temp'
AS $$
  SELECT
    schemaname::text,
    tablename::text,
    policyname::text,
    qual::text         AS qual_clause,
    with_check::text   AS with_check_clause
  FROM pg_catalog.pg_policies
  WHERE
    (qual IS NOT NULL       AND qual::text       ~* 'org_id\s+is\s+null')
    OR (with_check IS NOT NULL AND with_check::text ~* 'org_id\s+is\s+null')
  ORDER BY schemaname, tablename, policyname;
$$;

REVOKE EXECUTE ON FUNCTION public.atlas_list_null_bypass_policies() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.atlas_list_null_bypass_policies() TO service_role;

COMMENT ON FUNCTION public.atlas_list_null_bypass_policies()
  IS 'CI check: returns RLS policies whose USING/WITH-CHECK text contains "org_id IS NULL". Should always return 0 rows post-Phase-3 (mig 193).';
