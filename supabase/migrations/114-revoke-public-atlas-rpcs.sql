-- #94 R2: PostgreSQL grants EXECUTE to PUBLIC (implicit role that anon
-- and authenticated both inherit) by default on every CREATE FUNCTION.
-- Migration 113 revoked from anon + authenticated explicitly but left
-- the PUBLIC default grant intact, so anon still inherited EXECUTE.
-- An R2 curl test confirmed the hole was still open — anon could still
-- POST to atlas_add_greg_action and insert a row.
--
-- This migration revokes the PUBLIC grant on every atlas_* RPC except
-- atlas_report_agent_run. Post-migration: anon returns 401 "permission
-- denied for function" at the PostgREST layer, never entering the
-- function body.
--
-- Side cleanup: the R2 attack-test inserted id=95 (title='pwn',
-- source_session='x') into greg_actions. Delete it here so the queue
-- is clean.

DELETE FROM public.greg_actions
WHERE id = 95 AND title = 'pwn' AND source_session = 'x';

DO $$
DECLARE
  keep_public text[] := ARRAY['atlas_report_agent_run'];
  fn_row record;
  fn_signature text;
BEGIN
  FOR fn_row IN
    SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname LIKE 'atlas\_%'
  LOOP
    fn_signature := format('public.%I(%s)', fn_row.proname, fn_row.args);
    IF NOT (fn_row.proname = ANY(keep_public)) THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', fn_signature);
    END IF;
  END LOOP;
END $$;
