-- 039-organizations.sql — Multi-tenant organization model
-- Phase 1: Foundation tables for multi-org support

-- Organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  org_type        TEXT NOT NULL DEFAULT 'epc'
                  CHECK (org_type IN ('platform','epc','sales','engineering','supply','customer')),
  allowed_domains TEXT[] DEFAULT '{}',
  logo_url        TEXT,
  settings        JSONB DEFAULT '{}',
  active          BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Organization membership (user ↔ org with role)
CREATE TABLE IF NOT EXISTS public.org_memberships (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL,
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  org_role        TEXT NOT NULL DEFAULT 'member'
                  CHECK (org_role IN ('owner','admin','member','viewer')),
  is_default      BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, org_id)
);

-- Indexes
CREATE INDEX idx_org_slug ON organizations(slug);
CREATE INDEX idx_org_type ON organizations(org_type);
CREATE INDEX idx_org_active ON organizations(active);
CREATE INDEX idx_orgm_user ON org_memberships(user_id);
CREATE INDEX idx_orgm_org ON org_memberships(org_id);

-- RLS on organizations
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_select" ON organizations FOR SELECT TO authenticated USING (true);
CREATE POLICY "org_insert" ON organizations FOR INSERT TO authenticated WITH CHECK (auth_is_super_admin());
CREATE POLICY "org_update" ON organizations FOR UPDATE TO authenticated USING (auth_is_super_admin()) WITH CHECK (auth_is_super_admin());
CREATE POLICY "org_delete" ON organizations FOR DELETE TO authenticated USING (auth_is_super_admin());

-- RLS on org_memberships
ALTER TABLE org_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orgm_select" ON org_memberships FOR SELECT TO authenticated USING (true);
CREATE POLICY "orgm_insert" ON org_memberships FOR INSERT TO authenticated WITH CHECK (auth_is_admin());
CREATE POLICY "orgm_update" ON org_memberships FOR UPDATE TO authenticated USING (auth_is_admin()) WITH CHECK (auth_is_admin());
CREATE POLICY "orgm_delete" ON org_memberships FOR DELETE TO authenticated USING (auth_is_admin());
