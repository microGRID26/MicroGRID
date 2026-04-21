-- 135-rls-policy-hygiene-org-membership-walks.sql
-- ============================================================================
-- Close greg_actions #144 — rewrite 8 RLS policies across 4 tables that
-- use a dead `om.user_id = auth.uid()` inline walk.
--
-- Context:
--   Migrations 102/104/105/106 set up RLS policies for tables that only
--   platform (EDGE) and DSE Corp members should see:
--     project_cost_line_items (pcli_select, pcli_insert, pcli_update)
--     clearing_runs (clearing_runs_select, clearing_runs_insert)
--     entity_profit_transfers (ept_select, ept_insert)
--     sales_dealer_relationships (sdr_select)
--
--   Each policy's clause is: `auth_is_platform_user() OR EXISTS(...)` where
--   the EXISTS subquery walks org_memberships with `om.user_id = auth.uid()`.
--   After migration 132 we know that org_memberships.user_id stores
--   public.users.id, which is NOT equal to auth.uid() — so the subquery
--   never matches for any real user. The OR branch looks like it enforces
--   DSE-corp membership but it's dead code; only `auth_is_platform_user()`
--   actually gates access.
--
--   Today: 3 platform members, 0 DSE-corp members → no user-visible
--   regression because the OR branch returning zero rows doesn't matter
--   when there's no one it should have matched. But the moment DSE-corp
--   gets its first member (per MicroGRID Tier 2's spec), they will be
--   denied access to clearing_runs / entity_profit_transfers / etc. and
--   the bug will look like "RLS working as designed."
--
-- Fix: rewrite each policy's OR branch to use `auth_user_org_ids()` (the
-- canonical email-resolving helper from migration 132). Preserves the DSE
-- intent. Idempotent — DROP/CREATE within a transaction.
--
-- ============================================================================

-- ── project_cost_line_items ─────────────────────────────────────────────────

DROP POLICY IF EXISTS pcli_select ON public.project_cost_line_items;
CREATE POLICY pcli_select ON public.project_cost_line_items
  FOR SELECT TO authenticated
  USING (
    public.auth_is_platform_user()
    OR EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = ANY(public.auth_user_org_ids())
        AND o.org_type = 'direct_supply_equity_corp'
        AND o.active = true
    )
  );

DROP POLICY IF EXISTS pcli_insert ON public.project_cost_line_items;
CREATE POLICY pcli_insert ON public.project_cost_line_items
  FOR INSERT TO authenticated
  WITH CHECK (
    public.auth_is_platform_user()
    OR EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = ANY(public.auth_user_org_ids())
        AND o.org_type = 'direct_supply_equity_corp'
        AND o.active = true
    )
  );

DROP POLICY IF EXISTS pcli_update ON public.project_cost_line_items;
CREATE POLICY pcli_update ON public.project_cost_line_items
  FOR UPDATE TO authenticated
  USING (
    public.auth_is_platform_user()
    OR EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = ANY(public.auth_user_org_ids())
        AND o.org_type = 'direct_supply_equity_corp'
        AND o.active = true
    )
  )
  WITH CHECK (
    public.auth_is_platform_user()
    OR EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = ANY(public.auth_user_org_ids())
        AND o.org_type = 'direct_supply_equity_corp'
        AND o.active = true
    )
  );

-- ── clearing_runs ───────────────────────────────────────────────────────────

DROP POLICY IF EXISTS clearing_runs_select ON public.clearing_runs;
CREATE POLICY clearing_runs_select ON public.clearing_runs
  FOR SELECT TO authenticated
  USING (
    public.auth_is_platform_user()
    OR EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = ANY(public.auth_user_org_ids())
        AND o.org_type = 'direct_supply_equity_corp'
        AND o.active = true
    )
  );

DROP POLICY IF EXISTS clearing_runs_insert ON public.clearing_runs;
CREATE POLICY clearing_runs_insert ON public.clearing_runs
  FOR INSERT TO authenticated
  WITH CHECK (
    public.auth_is_platform_user()
    OR EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = ANY(public.auth_user_org_ids())
        AND o.org_type = 'direct_supply_equity_corp'
        AND o.active = true
    )
  );

-- ── entity_profit_transfers ─────────────────────────────────────────────────

DROP POLICY IF EXISTS ept_select ON public.entity_profit_transfers;
CREATE POLICY ept_select ON public.entity_profit_transfers
  FOR SELECT TO authenticated
  USING (
    public.auth_is_platform_user()
    OR EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = ANY(public.auth_user_org_ids())
        AND o.org_type = 'direct_supply_equity_corp'
        AND o.active = true
    )
  );

DROP POLICY IF EXISTS ept_insert ON public.entity_profit_transfers;
CREATE POLICY ept_insert ON public.entity_profit_transfers
  FOR INSERT TO authenticated
  WITH CHECK (
    public.auth_is_platform_user()
    OR EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = ANY(public.auth_user_org_ids())
        AND o.org_type = 'direct_supply_equity_corp'
        AND o.active = true
    )
  );

-- ── sales_dealer_relationships ──────────────────────────────────────────────

DROP POLICY IF EXISTS sdr_select ON public.sales_dealer_relationships;
CREATE POLICY sdr_select ON public.sales_dealer_relationships
  FOR SELECT TO authenticated
  USING (
    public.auth_is_platform_user()
    OR EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = ANY(public.auth_user_org_ids())
        AND o.org_type = 'direct_supply_equity_corp'
        AND o.active = true
    )
  );
