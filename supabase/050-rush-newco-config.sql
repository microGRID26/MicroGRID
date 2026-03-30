-- Migration 050: Rush Engineering auto-routing config + NewCo Supply pricing fields
-- Rush Engineering is the exclusive design partner for all EPCs.
-- NewCo Supply needs sourcing/raw_price/sell_price on equipment, materials, and warehouse.

-- ── Engineering partner configuration ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.engineering_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed Rush Engineering defaults
INSERT INTO engineering_config (config_key, value, description) VALUES
  ('exclusive_partner_org_slug', 'rush', 'Slug of the exclusive engineering partner org'),
  ('design_fee', '1200', 'Flat fee per funded project at installation ($)'),
  ('auto_route_enabled', 'true', 'When true, all new engineering assignments auto-route to the exclusive partner')
ON CONFLICT (config_key) DO NOTHING;

-- RLS: all authenticated can read, admin can write
ALTER TABLE engineering_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY eng_config_select ON engineering_config FOR SELECT TO authenticated USING (true);
CREATE POLICY eng_config_insert ON engineering_config FOR INSERT TO authenticated WITH CHECK (auth_is_admin());
CREATE POLICY eng_config_update ON engineering_config FOR UPDATE TO authenticated USING (auth_is_admin()) WITH CHECK (auth_is_admin());
CREATE POLICY eng_config_delete ON engineering_config FOR DELETE TO authenticated USING (auth_is_admin());

-- ── NewCo Supply pricing fields ──────────────────────────────────────────────

-- Equipment catalog pricing
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS sourcing TEXT;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS raw_price NUMERIC(12,2);
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS sell_price NUMERIC(12,2);

-- Project materials pricing
ALTER TABLE project_materials ADD COLUMN IF NOT EXISTS sourcing TEXT;
ALTER TABLE project_materials ADD COLUMN IF NOT EXISTS raw_price NUMERIC(12,2);
ALTER TABLE project_materials ADD COLUMN IF NOT EXISTS sell_price NUMERIC(12,2);

-- Warehouse stock pricing
ALTER TABLE warehouse_stock ADD COLUMN IF NOT EXISTS sourcing TEXT;
ALTER TABLE warehouse_stock ADD COLUMN IF NOT EXISTS raw_price NUMERIC(12,2);
ALTER TABLE warehouse_stock ADD COLUMN IF NOT EXISTS sell_price NUMERIC(12,2);
