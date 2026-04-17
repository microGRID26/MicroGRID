-- 111: Security audit R1 (Session 55, 2026-04-17)
-- Addresses 4 findings from Supabase advisor + DB/perf explore agents:
--   C1  rep_licenses RLS disabled — 10 rows of rep PII publicly readable
--   C2  partner_api_logs + partner_webhook_deliveries monthly partitions
--       don't inherit RLS from parent; 6 partition children (202604/05/06)
--       are publicly queryable with the anon/publishable key
--   C4  4 SECURITY DEFINER views bypass RLS (ticket_metrics,
--       funding_dashboard, project_cost_basis_summary, ticket_rep_stats)
--   H2  rep_files RLS disabled (empty today, will leak once populated)
-- The systemic `atlas_*` RPCs granted-to-anon issue (C3 + C-MEGA) is
-- NOT addressed here — it needs coordinated changes across MG + HQ and
-- is tracked as a P0 action queue item for a dedicated session.

-- ── C1 + H2: rep_licenses / rep_files RLS ───────────────────────────────────

ALTER TABLE public.rep_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rep_files    ENABLE ROW LEVEL SECURITY;

-- Only platform admins + super_admin see rep_licenses / rep_files. These tables
-- contain rep PII (license numbers, states, file URLs) that shouldn't be
-- queryable by regular authenticated users, much less anon.
DROP POLICY IF EXISTS rep_licenses_admin_all ON public.rep_licenses;
CREATE POLICY rep_licenses_admin_all ON public.rep_licenses
  FOR ALL TO authenticated
  USING (public.auth_is_admin() OR public.auth_is_super_admin())
  WITH CHECK (public.auth_is_admin() OR public.auth_is_super_admin());

DROP POLICY IF EXISTS rep_files_admin_all ON public.rep_files;
CREATE POLICY rep_files_admin_all ON public.rep_files
  FOR ALL TO authenticated
  USING (public.auth_is_admin() OR public.auth_is_super_admin())
  WITH CHECK (public.auth_is_admin() OR public.auth_is_super_admin());

-- ── C2: partner_api_logs + partner_webhook_deliveries partition RLS ─────────

-- Postgres doesn't auto-propagate ENABLE ROW LEVEL SECURITY from parent to
-- partition children, and the default for newly-created tables is RLS off.
-- So every monthly partition created by ensure_partner_partitions is publicly
-- queryable even though the parent has RLS on. Enable RLS on all existing
-- children now, and patch ensure_partner_partitions to enable RLS on any
-- future children.

DO $$
DECLARE
  c RECORD;
BEGIN
  FOR c IN
    SELECT cl.oid, n.nspname, cl.relname
      FROM pg_class cl
      JOIN pg_namespace n ON n.oid = cl.relnamespace
      JOIN pg_inherits i ON i.inhrelid = cl.oid
      JOIN pg_class pc ON pc.oid = i.inhparent
     WHERE n.nspname = 'public'
       AND pc.relname IN ('partner_api_logs', 'partner_webhook_deliveries')
       AND cl.relkind = 'r'
  LOOP
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', c.nspname, c.relname);
  END LOOP;
END $$;

-- Replace ensure_partner_partitions so every newly-created partition inherits
-- the parent's RLS intent via an explicit ENABLE. Parent-level policies still
-- apply to partition reads via RLS inheritance, so no per-child policy needed.
CREATE OR REPLACE FUNCTION public.ensure_partner_partitions(p_months_ahead INT DEFAULT 2)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  m INT;
  part_start DATE;
  part_end DATE;
  tbl TEXT;
  part_name TEXT;
  created_count INT := 0;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['partner_webhook_deliveries', 'partner_api_logs']) LOOP
    FOR m IN 0..p_months_ahead LOOP
      part_start := date_trunc('month', now() + (m || ' month')::interval)::date;
      part_end := (part_start + interval '1 month')::date;
      part_name := tbl || '_' || to_char(part_start, 'YYYYMM');
      BEGIN
        EXECUTE format(
          'CREATE TABLE IF NOT EXISTS public.%I PARTITION OF public.%I FOR VALUES FROM (%L) TO (%L)',
          part_name, tbl, part_start, part_end
        );
        -- R1 fix: partitions don't inherit ENABLE ROW LEVEL SECURITY from
        -- their parent. Enable it explicitly so every new partition is
        -- covered by the parent's RLS policies.
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', part_name);
        created_count := created_count + 1;
      EXCEPTION WHEN duplicate_table THEN
        NULL;
      END;
    END LOOP;
  END LOOP;
  RETURN created_count;
END;
$$;

-- ── C4: SECURITY DEFINER views → SECURITY INVOKER ───────────────────────────

-- Postgres 15+ supports ALTER VIEW ... SET (security_invoker = true). These 4
-- views currently query as their creator (postgres superuser), which bypasses
-- RLS on the underlying tables. Switch to invoker semantics so the caller's
-- RLS applies — matches the standard Supabase "view is just a SELECT" model.
ALTER VIEW public.ticket_metrics              SET (security_invoker = true);
ALTER VIEW public.funding_dashboard           SET (security_invoker = true);
ALTER VIEW public.project_cost_basis_summary  SET (security_invoker = true);
ALTER VIEW public.ticket_rep_stats            SET (security_invoker = true);

COMMENT ON VIEW public.funding_dashboard IS
  'SECURITY INVOKER (enforced 2026-04-17 migration 111): caller''s RLS applies to the joined projects + project_funding rows.';
