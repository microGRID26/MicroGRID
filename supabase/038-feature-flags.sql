-- 038: Feature flags system
-- Admin-toggleable feature flags for gradual rollout and feature gating

CREATE TABLE IF NOT EXISTS feature_flags (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key    TEXT NOT NULL UNIQUE,
  label       TEXT NOT NULL,
  description TEXT,
  enabled     BOOLEAN NOT NULL DEFAULT true,
  rollout_percentage INTEGER NOT NULL DEFAULT 100 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  allowed_roles TEXT[],           -- null = all roles, or specific roles like {'admin','manager'}
  allowed_org_ids TEXT[],         -- null = all orgs (future multi-tenant)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_feature_flags_key ON feature_flags (flag_key);
CREATE INDEX IF NOT EXISTS idx_feature_flags_enabled ON feature_flags (enabled);

-- RLS
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read flags
CREATE POLICY "feature_flags_select" ON feature_flags
  FOR SELECT TO authenticated USING (true);

-- Only admins can modify flags
CREATE POLICY "feature_flags_insert" ON feature_flags
  FOR INSERT TO authenticated WITH CHECK (auth_is_admin());

CREATE POLICY "feature_flags_update" ON feature_flags
  FOR UPDATE TO authenticated USING (auth_is_admin()) WITH CHECK (auth_is_admin());

CREATE POLICY "feature_flags_delete" ON feature_flags
  FOR DELETE TO authenticated USING (auth_is_admin());

-- Seed default flags
INSERT INTO feature_flags (flag_key, label, description, enabled, rollout_percentage, allowed_roles) VALUES
  ('atlas_reports',      'Atlas AI Reports',      'Natural language query interface for project data',  true,  100, '{manager,admin,super_admin}'),
  ('calendar_sync',      'Calendar Sync',         'Google Calendar integration for schedule events',    true,  100, NULL),
  ('warranty_tracking',  'Warranty Tracking',      'Warranty management page for equipment warranties',  true,  100, NULL),
  ('fleet_management',   'Fleet Management',       'Vehicle and fleet tracking page',                    true,  100, NULL),
  ('custom_fields',      'Custom Fields',          'Custom fields on project records',                   true,  100, NULL),
  ('permit_portal',      'Permit Portal',          'Permit submission and tracking portal',              true,  100, NULL),
  ('barcode_scanning',   'Barcode Scanning',       'Mobile barcode scanner for warehouse items',         true,  100, NULL)
ON CONFLICT (flag_key) DO NOTHING;
