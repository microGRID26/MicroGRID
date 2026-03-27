-- 036-custom-fields.sql
-- Custom field definitions and values for project extensibility

-- ── Field Definitions ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS custom_field_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_name TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN ('text', 'number', 'date', 'select', 'boolean', 'url')),
  options JSONB DEFAULT NULL,          -- for select type: ["Option A", "Option B"]
  required BOOLEAN DEFAULT false,
  default_value TEXT DEFAULT NULL,
  section TEXT DEFAULT 'custom',       -- which section of Info tab to show in
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_custom_field_defs_active ON custom_field_definitions (active, sort_order);

-- RLS: everyone can read, only admins can write
ALTER TABLE custom_field_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "custom_field_defs_select" ON custom_field_definitions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "custom_field_defs_insert" ON custom_field_definitions
  FOR INSERT TO authenticated WITH CHECK (auth_is_admin());

CREATE POLICY "custom_field_defs_update" ON custom_field_definitions
  FOR UPDATE TO authenticated USING (auth_is_admin()) WITH CHECK (auth_is_admin());

CREATE POLICY "custom_field_defs_delete" ON custom_field_definitions
  FOR DELETE TO authenticated USING (auth_is_admin());

-- ── Field Values ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS custom_field_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,
  field_id UUID NOT NULL REFERENCES custom_field_definitions(id) ON DELETE CASCADE,
  value TEXT DEFAULT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (project_id, field_id)
);

CREATE INDEX IF NOT EXISTS idx_custom_field_values_project ON custom_field_values (project_id);
CREATE INDEX IF NOT EXISTS idx_custom_field_values_field ON custom_field_values (field_id);

-- RLS: everyone can read and write values
ALTER TABLE custom_field_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "custom_field_values_select" ON custom_field_values
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "custom_field_values_insert" ON custom_field_values
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "custom_field_values_update" ON custom_field_values
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
