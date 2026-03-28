-- 042-org-rls-helpers.sql — RLS helper functions for multi-tenant org checks
-- Phase 1: Functions only — no policy changes yet

-- Returns all org IDs the current user belongs to
CREATE OR REPLACE FUNCTION public.auth_user_org_ids()
RETURNS UUID[] LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT COALESCE(
    ARRAY(SELECT org_id FROM org_memberships WHERE user_id = auth.uid()),
    '{}'::UUID[]
  );
$$;

-- Check if user belongs to a specific org
CREATE OR REPLACE FUNCTION public.auth_is_org_member(target_org_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT EXISTS(
    SELECT 1 FROM org_memberships
    WHERE user_id = auth.uid() AND org_id = target_org_id
  );
$$;

-- Check if user is an admin/owner within a specific org
CREATE OR REPLACE FUNCTION public.auth_is_org_admin(target_org_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT EXISTS(
    SELECT 1 FROM org_memberships
    WHERE user_id = auth.uid()
    AND org_id = target_org_id
    AND org_role IN ('owner', 'admin')
  ) OR auth_is_super_admin();
$$;

-- Check if user belongs to a platform-type org (EDGE)
CREATE OR REPLACE FUNCTION public.auth_is_platform_user()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT EXISTS(
    SELECT 1 FROM org_memberships om
    JOIN organizations o ON o.id = om.org_id
    WHERE om.user_id = auth.uid() AND o.org_type = 'platform'
  ) OR auth_is_super_admin();
$$;
