-- 045-ntp-workflow.sql — NTP (Notice to Proceed) workflow
-- Multi-org feature: EPCs submit projects for underwriting, EDGE (platform) approves/rejects.

-- ── Table ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ntp_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  requesting_org UUID NOT NULL REFERENCES public.organizations(id),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'under_review', 'approved', 'rejected', 'revision_required')),
  submitted_by TEXT,
  submitted_by_id UUID,
  reviewed_by TEXT,
  reviewed_by_id UUID,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  revision_notes TEXT,
  evidence JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_ntp_requests_project_id ON public.ntp_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_ntp_requests_status ON public.ntp_requests(status);
CREATE INDEX IF NOT EXISTS idx_ntp_requests_requesting_org ON public.ntp_requests(requesting_org);
CREATE INDEX IF NOT EXISTS idx_ntp_requests_submitted_at ON public.ntp_requests(submitted_at DESC);

-- ── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE public.ntp_requests ENABLE ROW LEVEL SECURITY;

-- Requesting org reads own requests; platform users read all
CREATE POLICY ntp_requests_select ON public.ntp_requests
  FOR SELECT TO authenticated
  USING (
    requesting_org = ANY(auth_user_org_ids())
    OR auth_is_platform_user()
    OR auth_is_super_admin()
  );

-- Any authenticated user in the requesting org can insert
CREATE POLICY ntp_requests_insert ON public.ntp_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    requesting_org = ANY(auth_user_org_ids())
  );

-- Platform users (EDGE) can update any request (for review actions)
-- Requesting org can update own requests (for resubmission after revision)
CREATE POLICY ntp_requests_update ON public.ntp_requests
  FOR UPDATE TO authenticated
  USING (
    requesting_org = ANY(auth_user_org_ids())
    OR auth_is_platform_user()
    OR auth_is_super_admin()
  )
  WITH CHECK (
    requesting_org = ANY(auth_user_org_ids())
    OR auth_is_platform_user()
    OR auth_is_super_admin()
  );

-- Only platform users or super admins can delete
CREATE POLICY ntp_requests_delete ON public.ntp_requests
  FOR DELETE TO authenticated
  USING (
    auth_is_platform_user()
    OR auth_is_super_admin()
  );

-- ── Updated_at trigger ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.ntp_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ntp_requests_updated_at_trigger ON public.ntp_requests;
CREATE TRIGGER ntp_requests_updated_at_trigger
  BEFORE UPDATE ON public.ntp_requests
  FOR EACH ROW EXECUTE FUNCTION public.ntp_requests_updated_at();
