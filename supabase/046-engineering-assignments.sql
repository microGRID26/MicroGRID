-- Migration 046: Engineering Assignments
-- Rush Engineering workflow — EPCs assign projects to engineering orgs for design work.
-- Engineering orgs complete work and submit deliverables back.

-- Engineering assignment table
CREATE TABLE IF NOT EXISTS public.engineering_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  assigned_org UUID NOT NULL REFERENCES public.organizations(id),
  requesting_org UUID NOT NULL REFERENCES public.organizations(id),
  assignment_type TEXT NOT NULL DEFAULT 'new_design'
    CHECK (assignment_type IN ('new_design', 'redesign', 'review', 'stamp')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'assigned', 'in_progress', 'review', 'revision_needed', 'complete', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  assigned_to TEXT,
  assigned_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  due_date DATE,
  notes TEXT,
  deliverables JSONB DEFAULT '[]'::jsonb,
  revision_count INTEGER DEFAULT 0,
  created_by TEXT,
  created_by_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_eng_assign_project ON engineering_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_eng_assign_status ON engineering_assignments(status);
CREATE INDEX IF NOT EXISTS idx_eng_assign_assigned_org ON engineering_assignments(assigned_org);
CREATE INDEX IF NOT EXISTS idx_eng_assign_requesting_org ON engineering_assignments(requesting_org);
CREATE INDEX IF NOT EXISTS idx_eng_assign_due_date ON engineering_assignments(due_date);

-- RLS
ALTER TABLE engineering_assignments ENABLE ROW LEVEL SECURITY;

-- Both requesting and assigned orgs can read
CREATE POLICY eng_assign_select ON engineering_assignments
  FOR SELECT TO authenticated
  USING (
    requesting_org = ANY(auth_user_org_ids())
    OR assigned_org = ANY(auth_user_org_ids())
    OR auth_is_platform_user()
    OR auth_is_super_admin()
  );

-- Requesting org can create assignments
CREATE POLICY eng_assign_insert ON engineering_assignments
  FOR INSERT TO authenticated
  WITH CHECK (
    requesting_org = ANY(auth_user_org_ids())
    OR auth_is_platform_user()
  );

-- Both orgs can update (requesting for cancellation, assigned for status changes)
CREATE POLICY eng_assign_update ON engineering_assignments
  FOR UPDATE TO authenticated
  USING (
    requesting_org = ANY(auth_user_org_ids())
    OR assigned_org = ANY(auth_user_org_ids())
    OR auth_is_platform_user()
  )
  WITH CHECK (
    requesting_org = ANY(auth_user_org_ids())
    OR assigned_org = ANY(auth_user_org_ids())
    OR auth_is_platform_user()
  );

-- Only platform or super admin can delete
CREATE POLICY eng_assign_delete ON engineering_assignments
  FOR DELETE TO authenticated
  USING (auth_is_platform_user() OR auth_is_super_admin());

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.eng_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS eng_assignments_updated_at_trigger ON engineering_assignments;
CREATE TRIGGER eng_assignments_updated_at_trigger
  BEFORE UPDATE ON engineering_assignments
  FOR EACH ROW EXECUTE FUNCTION public.eng_assignments_updated_at();
