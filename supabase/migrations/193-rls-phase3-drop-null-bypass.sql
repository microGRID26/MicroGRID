-- Migration 193 — RLS Phase 3 — drop `org_id IS NULL` bypass from 52 v2 policies
--
-- Closes greg_actions:
--   #350 — backfill + drop org_id IS NULL bypass (75 NULL rows leak globally)
--   #360 — projects_update_v2 WITH CHECK accepts org_id := NULL
--
-- Pattern rewritten across 52 policies:
--   OLD: ((org_id IS NULL) OR (org_id = ANY (auth_user_org_ids())) OR auth_is_platform_user())
--   NEW: ((org_id = ANY (auth_user_org_ids())) OR auth_is_platform_user())
--
-- Pre-flight (verified 2026-04-29, all = 0):
--   commission_advances, commission_records, crews, customer_billing_statements,
--   customer_feedback, customer_messages, customer_payment_methods, customer_payments,
--   customer_referrals, document_requirements, notification_rules, permit_submissions,
--   projects, queue_sections, sales_reps, sales_teams, schedule, task_reasons,
--   tickets, warehouse_stock — all have ZERO rows with org_id IS NULL.
--
-- Phase 1 (migration 189) backfilled the 75 NULL rows. Phase 2 (migration 191) dropped
-- auth_full_access + added legacy fallback. Phase 3 (this migration) removes the NULL-bypass
-- disjunct from every v2 policy. Phase 4 (next migration) will enforce NOT NULL on org_id.
--
-- Plan: ~/repos/MicroGRID/docs/plans/2026-04-28-multi-tenant-rls-hardening-plan.md

BEGIN;

-- ============================================================================
-- Snapshot for rollback
-- ============================================================================
CREATE TABLE IF NOT EXISTS public._rls_phase3_snapshot (
  tablename text NOT NULL,
  policyname text NOT NULL,
  cmd text NOT NULL,
  permissive text NOT NULL,
  roles text[] NOT NULL,
  qual text,
  with_check text,
  snapshotted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tablename, policyname)
);
-- Internal rollback snapshot — deny-all RLS (no policies = no access via PostgREST)
ALTER TABLE public._rls_phase3_snapshot ENABLE ROW LEVEL SECURITY;

INSERT INTO public._rls_phase3_snapshot (tablename, policyname, cmd, permissive, roles, qual, with_check)
SELECT tablename, policyname, cmd, permissive, roles, qual, with_check
FROM pg_policies
WHERE schemaname='public'
  AND (qual LIKE '%org_id IS NULL%' OR with_check LIKE '%org_id IS NULL%')
ON CONFLICT (tablename, policyname) DO UPDATE
  SET qual = EXCLUDED.qual,
      with_check = EXCLUDED.with_check,
      snapshotted_at = now();

-- ============================================================================
-- DIRECT pattern — `(org_id IS NULL) OR ...` in qual or with_check
-- ============================================================================

-- projects ---------------------------------------------------------------
DROP POLICY IF EXISTS projects_select_v2 ON public.projects;
CREATE POLICY projects_select_v2 ON public.projects
  AS PERMISSIVE FOR SELECT TO authenticated
  USING ((org_id = ANY (auth_user_org_ids())) OR auth_is_platform_user());

DROP POLICY IF EXISTS projects_insert_v2 ON public.projects;
CREATE POLICY projects_insert_v2 ON public.projects
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((org_id = ANY (auth_user_org_ids())) OR auth_is_platform_user());

-- closes #360: WITH CHECK no longer accepts org_id := NULL
DROP POLICY IF EXISTS projects_update_v2 ON public.projects;
CREATE POLICY projects_update_v2 ON public.projects
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((org_id = ANY (auth_user_org_ids())) OR auth_is_platform_user())
         AND ((pm_id = auth_user_id()) OR auth_is_manager()))
  WITH CHECK (((org_id = ANY (auth_user_org_ids())) OR auth_is_platform_user())
              AND ((pm_id = auth_user_id()) OR auth_is_manager()));

-- crews ------------------------------------------------------------------
DROP POLICY IF EXISTS crews_select_v2 ON public.crews;
CREATE POLICY crews_select_v2 ON public.crews
  AS PERMISSIVE FOR SELECT TO authenticated
  USING ((org_id = ANY (auth_user_org_ids())) OR auth_is_platform_user());

-- queue_sections ---------------------------------------------------------
DROP POLICY IF EXISTS qs_select_v2 ON public.queue_sections;
CREATE POLICY qs_select_v2 ON public.queue_sections
  AS PERMISSIVE FOR SELECT TO authenticated
  USING ((org_id = ANY (auth_user_org_ids())) OR auth_is_platform_user());

-- schedule ---------------------------------------------------------------
DROP POLICY IF EXISTS schedule_select_v3 ON public.schedule;
CREATE POLICY schedule_select_v3 ON public.schedule
  AS PERMISSIVE FOR SELECT TO authenticated
  USING ((org_id = ANY (auth_user_org_ids())) OR auth_is_platform_user());

-- task_reasons -----------------------------------------------------------
DROP POLICY IF EXISTS tr_select_v2 ON public.task_reasons;
CREATE POLICY tr_select_v2 ON public.task_reasons
  AS PERMISSIVE FOR SELECT TO authenticated
  USING ((org_id = ANY (auth_user_org_ids())) OR auth_is_platform_user());

-- tickets ----------------------------------------------------------------
DROP POLICY IF EXISTS tickets_select ON public.tickets;
CREATE POLICY tickets_select ON public.tickets
  AS PERMISSIVE FOR SELECT TO authenticated
  USING ((org_id = ANY (auth_user_org_ids())) OR auth_is_platform_user());

-- warehouse_stock --------------------------------------------------------
DROP POLICY IF EXISTS ws_select_v2 ON public.warehouse_stock;
CREATE POLICY ws_select_v2 ON public.warehouse_stock
  AS PERMISSIVE FOR SELECT TO authenticated
  USING ((org_id = ANY (auth_user_org_ids())) OR auth_is_platform_user());

-- document_requirements --------------------------------------------------
DROP POLICY IF EXISTS dr_select_v2 ON public.document_requirements;
CREATE POLICY dr_select_v2 ON public.document_requirements
  AS PERMISSIVE FOR SELECT TO authenticated
  USING ((org_id = ANY (auth_user_org_ids())) OR auth_is_platform_user());

-- notification_rules -----------------------------------------------------
DROP POLICY IF EXISTS nr_select_v2 ON public.notification_rules;
CREATE POLICY nr_select_v2 ON public.notification_rules
  AS PERMISSIVE FOR SELECT TO authenticated
  USING ((org_id = ANY (auth_user_org_ids())) OR auth_is_platform_user());

-- sales_reps -------------------------------------------------------------
DROP POLICY IF EXISTS sr_select ON public.sales_reps;
CREATE POLICY sr_select ON public.sales_reps
  AS PERMISSIVE FOR SELECT TO authenticated
  USING ((org_id = ANY (auth_user_org_ids())) OR auth_is_platform_user());

-- sales_teams ------------------------------------------------------------
DROP POLICY IF EXISTS st_select ON public.sales_teams;
CREATE POLICY st_select ON public.sales_teams
  AS PERMISSIVE FOR SELECT TO authenticated
  USING ((org_id = ANY (auth_user_org_ids())) OR auth_is_platform_user());

-- commission_advances ----------------------------------------------------
DROP POLICY IF EXISTS ca_select ON public.commission_advances;
CREATE POLICY ca_select ON public.commission_advances
  AS PERMISSIVE FOR SELECT TO authenticated
  USING ((org_id = ANY (auth_user_org_ids())) OR auth_is_platform_user());

DROP POLICY IF EXISTS ca_insert ON public.commission_advances;
CREATE POLICY ca_insert ON public.commission_advances
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((org_id = ANY (auth_user_org_ids())) OR auth_is_platform_user());

-- commission_records -----------------------------------------------------
DROP POLICY IF EXISTS comm_records_select ON public.commission_records;
CREATE POLICY comm_records_select ON public.commission_records
  AS PERMISSIVE FOR SELECT TO authenticated
  USING ((org_id = ANY (auth_user_org_ids())) OR auth_is_platform_user());

DROP POLICY IF EXISTS comm_records_insert ON public.commission_records;
CREATE POLICY comm_records_insert ON public.commission_records
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((org_id = ANY (auth_user_org_ids())) OR auth_is_platform_user());

DROP POLICY IF EXISTS comm_records_update ON public.commission_records;
CREATE POLICY comm_records_update ON public.commission_records
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((org_id = ANY (auth_user_org_ids())) OR auth_is_platform_user())
  WITH CHECK ((org_id = ANY (auth_user_org_ids())) OR auth_is_platform_user());

-- permit_submissions -----------------------------------------------------
DROP POLICY IF EXISTS permit_sub_select ON public.permit_submissions;
CREATE POLICY permit_sub_select ON public.permit_submissions
  AS PERMISSIVE FOR SELECT TO authenticated
  USING ((org_id = ANY (auth_user_org_ids())) OR auth_is_platform_user());

DROP POLICY IF EXISTS permit_sub_insert ON public.permit_submissions;
CREATE POLICY permit_sub_insert ON public.permit_submissions
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (org_id = ANY (auth_user_org_ids()));

DROP POLICY IF EXISTS permit_sub_update ON public.permit_submissions;
CREATE POLICY permit_sub_update ON public.permit_submissions
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (org_id = ANY (auth_user_org_ids()));

-- customer_billing_statements --------------------------------------------
DROP POLICY IF EXISTS cbs_org_select ON public.customer_billing_statements;
CREATE POLICY cbs_org_select ON public.customer_billing_statements
  AS PERMISSIVE FOR SELECT TO public
  USING ((org_id = ANY (auth_user_org_ids())) OR auth_is_platform_user());

-- customer_feedback ------------------------------------------------------
DROP POLICY IF EXISTS cf_org_select ON public.customer_feedback;
CREATE POLICY cf_org_select ON public.customer_feedback
  AS PERMISSIVE FOR SELECT TO public
  USING ((org_id = ANY (auth_user_org_ids())) OR auth_is_platform_user());

DROP POLICY IF EXISTS cf_org_update ON public.customer_feedback;
CREATE POLICY cf_org_update ON public.customer_feedback
  AS PERMISSIVE FOR UPDATE TO public
  USING ((org_id = ANY (auth_user_org_ids())) OR auth_is_platform_user());

-- customer_messages ------------------------------------------------------
DROP POLICY IF EXISTS cm_org_select ON public.customer_messages;
CREATE POLICY cm_org_select ON public.customer_messages
  AS PERMISSIVE FOR SELECT TO public
  USING ((org_id = ANY (auth_user_org_ids())) OR auth_is_platform_user());

DROP POLICY IF EXISTS cm_org_insert ON public.customer_messages;
CREATE POLICY cm_org_insert ON public.customer_messages
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((org_id = ANY (auth_user_org_ids())) OR auth_is_platform_user());

DROP POLICY IF EXISTS cm_org_update_read ON public.customer_messages;
CREATE POLICY cm_org_update_read ON public.customer_messages
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((org_id = ANY (auth_user_org_ids())) OR auth_is_platform_user())
  WITH CHECK ((org_id = ANY (auth_user_org_ids())) OR auth_is_platform_user());

-- customer_payment_methods -----------------------------------------------
DROP POLICY IF EXISTS cpm_org_select ON public.customer_payment_methods;
CREATE POLICY cpm_org_select ON public.customer_payment_methods
  AS PERMISSIVE FOR SELECT TO public
  USING ((org_id = ANY (auth_user_org_ids())) OR auth_is_platform_user());

-- customer_payments — cp_org_select keeps customer_account_id branch (legitimate portal read)
DROP POLICY IF EXISTS cp_org_select ON public.customer_payments;
CREATE POLICY cp_org_select ON public.customer_payments
  AS PERMISSIVE FOR SELECT TO public
  USING (
    (customer_account_id IN (
      SELECT customer_accounts.id FROM customer_accounts
      WHERE customer_accounts.auth_user_id = (SELECT auth.uid())
    ))
    OR (org_id = ANY (auth_user_org_ids()))
    OR auth_is_platform_user()
  );

DROP POLICY IF EXISTS cp_org_insert ON public.customer_payments;
CREATE POLICY cp_org_insert ON public.customer_payments
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((org_id = ANY (auth_user_org_ids())) OR auth_is_platform_user());

DROP POLICY IF EXISTS cp_org_update ON public.customer_payments;
CREATE POLICY cp_org_update ON public.customer_payments
  AS PERMISSIVE FOR UPDATE TO public
  USING ((org_id = ANY (auth_user_org_ids())) OR auth_is_platform_user());

-- customer_referrals -----------------------------------------------------
DROP POLICY IF EXISTS customer_referrals_org_select ON public.customer_referrals;
CREATE POLICY customer_referrals_org_select ON public.customer_referrals
  AS PERMISSIVE FOR SELECT TO public
  USING ((org_id = ANY (auth_user_org_ids())) OR auth_is_platform_user());

-- ============================================================================
-- INDIRECT pattern — projects join (`p.org_id IS NULL OR ...`)
-- ============================================================================

-- audit_log --------------------------------------------------------------
DROP POLICY IF EXISTS al_select_v2 ON public.audit_log;
CREATE POLICY al_select_v2 ON public.audit_log
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = audit_log.project_id
      AND ((p.org_id = ANY (auth_user_org_ids())) OR auth_is_platform_user())
  ));

-- edge_sync_log ----------------------------------------------------------
DROP POLICY IF EXISTS esl_select_v2 ON public.edge_sync_log;
CREATE POLICY esl_select_v2 ON public.edge_sync_log
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = edge_sync_log.project_id
      AND ((p.org_id = ANY (auth_user_org_ids())) OR auth_is_platform_user())
  ));

-- equipment_warranties ---------------------------------------------------
DROP POLICY IF EXISTS ew_select_v2 ON public.equipment_warranties;
CREATE POLICY ew_select_v2 ON public.equipment_warranties
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = equipment_warranties.project_id
      AND ((p.org_id = ANY (auth_user_org_ids())) OR auth_is_platform_user())
  ));

-- notes ------------------------------------------------------------------
DROP POLICY IF EXISTS notes_select_v2 ON public.notes;
CREATE POLICY notes_select_v2 ON public.notes
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = notes.project_id
      AND ((p.org_id = ANY (auth_user_org_ids())) OR auth_is_platform_user())
  ));

-- project_adders ---------------------------------------------------------
DROP POLICY IF EXISTS pa_select_v2 ON public.project_adders;
CREATE POLICY pa_select_v2 ON public.project_adders
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_adders.project_id
      AND ((p.org_id = ANY (auth_user_org_ids())) OR auth_is_platform_user())
  ));

-- project_documents ------------------------------------------------------
DROP POLICY IF EXISTS pdocs_select_v2 ON public.project_documents;
CREATE POLICY pdocs_select_v2 ON public.project_documents
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_documents.project_id
      AND ((p.org_id = ANY (auth_user_org_ids())) OR auth_is_platform_user())
  ));

-- project_files ----------------------------------------------------------
DROP POLICY IF EXISTS pfiles_select_v2 ON public.project_files;
CREATE POLICY pfiles_select_v2 ON public.project_files
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_files.project_id
      AND ((p.org_id = ANY (auth_user_org_ids())) OR auth_is_platform_user())
  ));

-- project_folders --------------------------------------------------------
DROP POLICY IF EXISTS pf2_select_v2 ON public.project_folders;
CREATE POLICY pf2_select_v2 ON public.project_folders
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_folders.project_id
      AND ((p.org_id = ANY (auth_user_org_ids())) OR auth_is_platform_user())
  ));

-- project_funding --------------------------------------------------------
DROP POLICY IF EXISTS pf_select_v2 ON public.project_funding;
CREATE POLICY pf_select_v2 ON public.project_funding
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_funding.project_id
      AND ((p.org_id = ANY (auth_user_org_ids())) OR auth_is_platform_user())
  ));

-- project_materials ------------------------------------------------------
DROP POLICY IF EXISTS pm_select_v2 ON public.project_materials;
CREATE POLICY pm_select_v2 ON public.project_materials
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_materials.project_id
      AND ((p.org_id = ANY (auth_user_org_ids())) OR auth_is_platform_user())
  ));

-- service_calls ----------------------------------------------------------
DROP POLICY IF EXISTS sc_select_v2 ON public.service_calls;
CREATE POLICY sc_select_v2 ON public.service_calls
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = service_calls.project_id
      AND ((p.org_id = ANY (auth_user_org_ids())) OR auth_is_platform_user())
  ));

-- stage_history ----------------------------------------------------------
DROP POLICY IF EXISTS sh_select_v2 ON public.stage_history;
CREATE POLICY sh_select_v2 ON public.stage_history
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = stage_history.project_id
      AND ((p.org_id = ANY (auth_user_org_ids())) OR auth_is_platform_user())
  ));

-- task_history -----------------------------------------------------------
DROP POLICY IF EXISTS th_select_v2 ON public.task_history;
CREATE POLICY th_select_v2 ON public.task_history
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = task_history.project_id
      AND ((p.org_id = ANY (auth_user_org_ids())) OR auth_is_platform_user())
  ));

-- task_state -------------------------------------------------------------
DROP POLICY IF EXISTS ts_select_v2 ON public.task_state;
CREATE POLICY ts_select_v2 ON public.task_state
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = task_state.project_id
      AND ((p.org_id = ANY (auth_user_org_ids())) OR auth_is_platform_user())
  ));

-- warranty_claims --------------------------------------------------------
DROP POLICY IF EXISTS wc_select_v2 ON public.warranty_claims;
CREATE POLICY wc_select_v2 ON public.warranty_claims
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = warranty_claims.project_id
      AND ((p.org_id = ANY (auth_user_org_ids())) OR auth_is_platform_user())
  ));

-- work_orders ------------------------------------------------------------
DROP POLICY IF EXISTS wo_select_v2 ON public.work_orders;
CREATE POLICY wo_select_v2 ON public.work_orders
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = work_orders.project_id
      AND ((p.org_id = ANY (auth_user_org_ids())) OR auth_is_platform_user())
  ));

-- ============================================================================
-- INDIRECT pattern — purchase_orders join (NULL bypass nested)
-- ============================================================================
-- po_select_v2 keeps `(project_id IS NULL)` branch — that's a separate decision
-- (POs without project link visible to all internal); only drops `p.org_id IS NULL`.

DROP POLICY IF EXISTS po_select_v2 ON public.purchase_orders;
CREATE POLICY po_select_v2 ON public.purchase_orders
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    (project_id IS NULL)
    OR EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = purchase_orders.project_id
        AND ((p.org_id = ANY (auth_user_org_ids())) OR auth_is_platform_user())
    )
  );

-- po_line_items.poli_select_v2 — nested via purchase_orders
DROP POLICY IF EXISTS poli_select_v2 ON public.po_line_items;
CREATE POLICY poli_select_v2 ON public.po_line_items
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM purchase_orders po
    WHERE po.id = po_line_items.po_id
      AND (
        (po.project_id IS NULL)
        OR EXISTS (
          SELECT 1 FROM projects p
          WHERE p.id = po.project_id
            AND ((p.org_id = ANY (auth_user_org_ids())) OR auth_is_platform_user())
        )
      )
  ));

-- ============================================================================
-- INDIRECT pattern — work_orders join
-- ============================================================================
DROP POLICY IF EXISTS woci_select_v2 ON public.wo_checklist_items;
CREATE POLICY woci_select_v2 ON public.wo_checklist_items
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM work_orders wo
    JOIN projects p ON p.id = wo.project_id
    WHERE wo.id = wo_checklist_items.work_order_id
      AND ((p.org_id = ANY (auth_user_org_ids())) OR auth_is_platform_user())
  ));

-- ============================================================================
-- INDIRECT pattern — sales_reps join (sr.org_id IS NULL)
-- ============================================================================
DROP POLICY IF EXISTS od_select ON public.onboarding_documents;
CREATE POLICY od_select ON public.onboarding_documents
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM sales_reps sr
    WHERE sr.id = onboarding_documents.rep_id
      AND ((sr.org_id = ANY (auth_user_org_ids())) OR auth_is_platform_user())
  ));

-- ============================================================================
-- INDIRECT pattern — customer_feedback subquery
-- ============================================================================
DROP POLICY IF EXISTS cfa_org_select ON public.customer_feedback_attachments;
CREATE POLICY cfa_org_select ON public.customer_feedback_attachments
  AS PERMISSIVE FOR SELECT TO public
  USING (feedback_id IN (
    SELECT customer_feedback.id FROM customer_feedback
    WHERE (customer_feedback.org_id = ANY (auth_user_org_ids()))
       OR auth_is_platform_user()
  ));

-- ============================================================================
-- Post-migration verification (advisory; output goes to migration log)
-- ============================================================================
DO $$
DECLARE
  remaining int;
BEGIN
  SELECT count(*) INTO remaining
  FROM pg_policies
  WHERE schemaname='public'
    AND (qual LIKE '%org_id IS NULL%' OR with_check LIKE '%org_id IS NULL%');

  IF remaining > 0 THEN
    RAISE EXCEPTION 'Phase 3 incomplete: % policies still contain org_id IS NULL', remaining;
  END IF;

  RAISE NOTICE 'Phase 3 complete: 0 policies contain org_id IS NULL bypass';
END $$;

COMMIT;
