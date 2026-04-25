-- Migration 164 — close out the customer-feedback storage hardening that
-- was skipped when migration 157 hardened ticket-attachments + rep-files.
-- Three coupled changes that ship together (all required after R1 audit
-- of greg_actions #282):
--
-- 1. Drop NOT NULL on customer_feedback_attachments.file_url so the mobile
--    uploader can stop persisting dead public URLs (the bucket flipped
--    private in migration 154). Existing rows untouched.
--
-- 2. Replace the wide-open `customer_feedback_upload` storage RLS policy
--    (WITH CHECK = bucket_id only) with a path-prefix policy that mirrors
--    `ticket_attachments_insert_path_prefix` from migration 157. Without
--    this, any authenticated user can write to any path in the
--    customer-feedback bucket, which lets a CRM tester or another
--    customer squat or poison a victim's feedback prefix.
--
-- 3. Add a BEFORE INSERT/UPDATE trigger on customer_feedback_attachments
--    so the row's file_path must start with its own feedback_id. Closes
--    the row-level path-injection vector (insert legit row with own
--    feedback_id but file_path pointing at someone else's prefix —
--    surfaces another customer's screenshot when HQ wires up read-side
--    resolution).

-- ── 1. file_url nullable ──────────────────────────────────────────────────
alter table public.customer_feedback_attachments
  alter column file_url drop not null;

-- ── 2. storage.objects RLS for customer-feedback ──────────────────────────
DROP POLICY IF EXISTS "customer_feedback_upload" ON storage.objects;
DROP POLICY IF EXISTS "customer_feedback_insert_path_prefix" ON storage.objects;
DROP POLICY IF EXISTS "customer_feedback_select_path_prefix" ON storage.objects;
DROP POLICY IF EXISTS "customer_feedback_service_role_all" ON storage.objects;

-- Customer mobile clients (the only writers today) can only upload to
-- <feedback_id>/<filename> and only if the feedback row is theirs OR is
-- visible to them via existing customer_feedback table RLS (project
-- match via customer_accounts, org match for CRM users, platform users).
-- The path-shape regex (^uuid/[^/]+$) blocks `..` traversal and nested
-- folders.
CREATE POLICY "customer_feedback_insert_path_prefix"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'customer-feedback'
  AND name ~ '^[0-9a-f-]{36}/[^/]+$'
  AND EXISTS (
    SELECT 1 FROM public.customer_feedback cf
    WHERE cf.id::text = (storage.foldername(name))[1]
      AND (
        cf.submitted_by_user_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.customer_accounts ca
          WHERE ca.id = cf.customer_account_id
            AND ca.auth_user_id = (SELECT auth.uid())
            AND ca.status = 'active'
        )
        OR (cf.org_id IS NOT NULL AND cf.org_id = ANY (auth_user_org_ids()))
        OR auth_is_platform_user()
      )
  )
);

-- Read policy mirrors the table-level cfa_customer_select / cfa_org_select
-- rules in migration 087/097: a customer sees their own feedback's blobs;
-- an org/platform user sees any feedback in their scope. Empty today
-- (HQ doesn't surface MG attachments yet) but lands now so the bucket is
-- ready when fetchMicrogridFeedback wires up resolveMgSignedUrl.
CREATE POLICY "customer_feedback_select_path_prefix"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'customer-feedback'
  AND name ~ '^[0-9a-f-]{36}/[^/]+$'
  AND EXISTS (
    SELECT 1 FROM public.customer_feedback cf
    WHERE cf.id::text = (storage.foldername(name))[1]
      AND (
        cf.submitted_by_user_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.customer_accounts ca
          WHERE ca.id = cf.customer_account_id
            AND ca.auth_user_id = (SELECT auth.uid())
            AND ca.status = 'active'
        )
        OR (cf.org_id IS NOT NULL AND cf.org_id = ANY (auth_user_org_ids()))
        OR auth_is_platform_user()
      )
  )
);

-- Preserve service_role bypass so HQ server-side signing keeps working.
CREATE POLICY "customer_feedback_service_role_all"
ON storage.objects FOR ALL TO service_role
USING (bucket_id = 'customer-feedback')
WITH CHECK (bucket_id = 'customer-feedback');

-- ── 3. row-level path-binding trigger ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.enforce_customer_feedback_attachment_path()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.file_path IS NOT NULL THEN
    IF NEW.file_path !~ ('^' || NEW.feedback_id::text || '/[^/]+$') THEN
      RAISE EXCEPTION 'file_path must be <feedback_id>/<filename>, got: %', NEW.file_path
        USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enforce_customer_feedback_attachment_path() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enforce_customer_feedback_attachment_path() FROM anon;
REVOKE EXECUTE ON FUNCTION public.enforce_customer_feedback_attachment_path() FROM authenticated;

DROP TRIGGER IF EXISTS trg_enforce_customer_feedback_attachment_path
  ON public.customer_feedback_attachments;
CREATE TRIGGER trg_enforce_customer_feedback_attachment_path
BEFORE INSERT OR UPDATE ON public.customer_feedback_attachments
FOR EACH ROW EXECUTE FUNCTION public.enforce_customer_feedback_attachment_path();
