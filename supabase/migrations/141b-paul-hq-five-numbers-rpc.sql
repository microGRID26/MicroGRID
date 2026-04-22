-- Migration 141b: Paul HQ five-numbers RPC
-- SECURITY DEFINER, service-role only. Applied via Supabase MCP 2026-04-22.

CREATE OR REPLACE FUNCTION public.paul_hq_five_numbers()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_month_start timestamptz := date_trunc('month', now());
  v_open_ar numeric;
  v_installs_mtd int;
  v_pipeline_ct int;
  v_itc_eligible_pct numeric;
  v_chain_mtd int;
BEGIN
  SELECT COALESCE(SUM(total), 0) INTO v_open_ar
    FROM public.invoices
   WHERE paid_at IS NULL AND status IN ('draft','sent','open');

  SELECT count(*)::int INTO v_installs_mtd
    FROM public.projects
   WHERE NULLIF(in_service_date, '') IS NOT NULL
     AND (NULLIF(in_service_date, ''))::date >= v_month_start::date;

  SELECT count(*)::int INTO v_pipeline_ct
    FROM public.projects
   WHERE stage IN ('evaluation','design','permit','install','inspection');

  SELECT ROUND(AVG(itc_eligible_pct)::numeric, 1) INTO v_itc_eligible_pct
    FROM public.project_cost_basis_summary
   WHERE itc_eligible_pct IS NOT NULL;

  SELECT count(*)::int INTO v_chain_mtd
    FROM public.invoices
   WHERE invoice_number LIKE 'CHN-%' AND created_at >= v_month_start;

  RETURN jsonb_build_object(
    'open_ar', v_open_ar,
    'installs_mtd', v_installs_mtd,
    'pipeline_count', v_pipeline_ct,
    'avg_itc_eligible_pct', v_itc_eligible_pct,
    'chain_invoices_mtd', v_chain_mtd,
    'as_of', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.paul_hq_five_numbers() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.paul_hq_five_numbers() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.paul_hq_five_numbers() TO service_role;
