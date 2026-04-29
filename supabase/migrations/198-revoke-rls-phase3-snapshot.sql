-- 198-revoke-rls-phase3-snapshot.sql
-- Closes greg_actions #396.
-- Defense-in-depth on _rls_phase3_snapshot: RLS is already enabled deny-all,
-- service-role still works (bypasses RLS). PostgREST OpenAPI introspection
-- still leaks the table name + columns to anon/authenticated. Revoke all
-- to remove from the OpenAPI surface entirely.

REVOKE ALL ON public._rls_phase3_snapshot FROM anon, authenticated;
