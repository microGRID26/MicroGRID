-- #94 R1: revoke anon EXECUTE on atlas_* SECURITY DEFINER RPCs to close
-- the cross-repo privilege-escalation hole. An attacker holding MG's
-- public anon key could previously POST to /rest/v1/rpc/atlas_hq_create_user
-- and mint an owner-level HQ user row. Every atlas_* function (except
-- atlas_report_agent_run, which gates itself via p_secret) now rejects
-- anon-role callers.
--
-- HQ + EDGE-MODEL Vercel env vars flipped to sb_secret_* in the same ship,
-- so their server paths now resolve as service_role. EDGE-MODEL's runtime
-- JWT path (middleware auth + scenario/actuals reads) keeps `authenticated`
-- EXECUTE on the 11 edge_model-facing RPCs. Auth-flow RPCs (hq_get_user_role,
-- hq_link_auth_user) keep `authenticated` so the OAuth callback can resolve
-- its role lookup with the just-minted JWT. Everything else is service_role
-- only.

DO $$
DECLARE
  keep_authenticated text[] := ARRAY[
    'atlas_hq_get_user_role',
    'atlas_hq_link_auth_user',
    'atlas_list_edge_model_scenarios',
    'atlas_get_edge_model_scenario',
    'atlas_save_edge_model_scenario',
    'atlas_lock_edge_model_scenario',
    'atlas_delete_edge_model_scenario',
    'atlas_edge_model_actuals',
    'atlas_list_edge_model_sources',
    'atlas_get_live_edge_model_source',
    'atlas_upload_edge_model_source',
    'atlas_set_live_edge_model_source',
    'atlas_delete_edge_model_source',
    'atlas_update_edge_model_build_status'
  ];
  keep_anon text[] := ARRAY['atlas_report_agent_run'];

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

    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn_signature);

    IF NOT (fn_row.proname = ANY(keep_anon)) THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', fn_signature);
    END IF;

    IF NOT (fn_row.proname = ANY(keep_authenticated))
       AND NOT (fn_row.proname = ANY(keep_anon)) THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM authenticated', fn_signature);
    END IF;
  END LOOP;
END $$;
