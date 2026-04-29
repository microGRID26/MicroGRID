-- Migration 194 — RLS Phase 3b — close storage.objects NULL bypass missed by 193
--
-- R1 audit on migration 193 caught: 2 storage.objects policies on the
-- ticket-attachments bucket still carry `(t.org_id IS NULL)` after Phase 3,
-- because 193's snapshot + verifier were scoped to schemaname='public' only.
-- Today tickets has 0 NULL org_ids so the bypass is dormant, but it's dead
-- code that must be removed to make Phase 3's "no NULL bypass" claim true,
-- and to ensure the surface stays clean before Phase 4.
--
-- Also widens the snapshot table to record schemaname for rollback symmetry,
-- and re-runs the verifier across all schemas so future Phase work catches
-- non-public bypasses.

-- 1. Widen snapshot table to support multi-schema rollback
ALTER TABLE public._rls_phase3_snapshot
  ADD COLUMN IF NOT EXISTS schemaname text NOT NULL DEFAULT 'public';

-- Reset PK to include schemaname (drop+add; rows preserved)
ALTER TABLE public._rls_phase3_snapshot
  DROP CONSTRAINT IF EXISTS _rls_phase3_snapshot_pkey;
ALTER TABLE public._rls_phase3_snapshot
  ADD CONSTRAINT _rls_phase3_snapshot_pkey PRIMARY KEY (schemaname, tablename, policyname);

-- 2. Snapshot the 2 storage.objects policies BEFORE rewriting
INSERT INTO public._rls_phase3_snapshot (schemaname, tablename, policyname, cmd, permissive, roles, qual, with_check)
SELECT schemaname, tablename, policyname, cmd, permissive, roles, qual, with_check
FROM pg_policies
WHERE schemaname='storage'
  AND tablename='objects'
  AND policyname IN ('ticket_attachments_select_path_prefix', 'ticket_attachments_insert_path_prefix')
ON CONFLICT (schemaname, tablename, policyname) DO UPDATE
  SET qual = EXCLUDED.qual,
      with_check = EXCLUDED.with_check,
      snapshotted_at = now();

-- 3. Rewrite ticket_attachments_select_path_prefix — drop (t.org_id IS NULL)
DROP POLICY IF EXISTS ticket_attachments_select_path_prefix ON storage.objects;
CREATE POLICY ticket_attachments_select_path_prefix ON storage.objects
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    bucket_id = 'ticket-attachments'
    AND name ~ '^[0-9a-f-]{36}/[^/]+$'
    AND EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE (t.id)::text = (storage.foldername(objects.name))[1]
        AND (
          (t.org_id = ANY (public.auth_user_org_ids()))
          OR public.auth_is_platform_user()
          OR EXISTS (
            SELECT 1 FROM public.customer_accounts ca
            WHERE ca.project_id = t.project_id
              AND ca.auth_user_id = (SELECT auth.uid())
              AND ca.status = 'active'
          )
        )
    )
  );

-- 4. Rewrite ticket_attachments_insert_path_prefix — drop (t.org_id IS NULL)
DROP POLICY IF EXISTS ticket_attachments_insert_path_prefix ON storage.objects;
CREATE POLICY ticket_attachments_insert_path_prefix ON storage.objects
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'ticket-attachments'
    AND name ~ '^[0-9a-f-]{36}/[^/]+$'
    AND EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE (t.id)::text = (storage.foldername(objects.name))[1]
        AND (
          (t.org_id = ANY (public.auth_user_org_ids()))
          OR public.auth_is_platform_user()
          OR EXISTS (
            SELECT 1 FROM public.customer_accounts ca
            WHERE ca.project_id = t.project_id
              AND ca.auth_user_id = (SELECT auth.uid())
              AND ca.status = 'active'
          )
        )
    )
  );

-- 5. Verifier — ALL schemas, regex-based (case + whitespace insensitive)
DO $$
DECLARE
  remaining int;
BEGIN
  SELECT count(*) INTO remaining
  FROM pg_policies
  WHERE (qual ~* 'org_id\s+is\s+null' OR with_check ~* 'org_id\s+is\s+null');

  IF remaining > 0 THEN
    RAISE EXCEPTION 'Phase 3b incomplete: % policies (any schema) still contain org_id IS NULL', remaining;
  END IF;

  RAISE NOTICE 'Phase 3b complete: 0 policies in any schema contain org_id IS NULL bypass';
END $$;
