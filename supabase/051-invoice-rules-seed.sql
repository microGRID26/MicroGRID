-- 051-invoice-rules-seed.sql — Mark's 8 inter-org invoice flow templates
-- Defines the billing relationships between MicroGRID ecosystem orgs.
-- All org_types are valid per the organizations CHECK constraint:
--   platform, epc, sales, engineering, supply, customer

-- Add unique constraint so ON CONFLICT works on re-run (idempotent seed)
CREATE UNIQUE INDEX IF NOT EXISTS idx_inv_rules_name_unique ON invoice_rules (name);

INSERT INTO invoice_rules (name, milestone, from_org_type, to_org_type, line_items, active) VALUES

  -- 1. MicroGRID Sales & Marketing → EPC (Sales, Marketing, Tech services)
  ('Sales & Marketing Services', 'contract_signed', 'sales', 'epc',
   '[{"description": "Sales Services", "category": "sales"},
     {"description": "Marketing Services", "category": "marketing"},
     {"description": "Technology Platform Fee", "category": "technology"}]'::jsonb,
   true),

  -- 2. NewCo Supply → EPC (Equipment and materials)
  ('Equipment & Materials', 'installation', 'supply', 'epc',
   '[{"description": "Solar Panels", "category": "equipment"},
     {"description": "Inverter", "category": "equipment"},
     {"description": "Battery Storage", "category": "equipment"},
     {"description": "Racking & BOS", "category": "materials"},
     {"description": "Shipping & Logistics", "category": "logistics"}]'::jsonb,
   true),

  -- 3. Rush Engineering → EPC (Design/Engineering — $1,200 flat rate at installation)
  ('Engineering Design Services', 'installation', 'engineering', 'epc',
   '[{"description": "System Design & Engineering", "quantity": 1, "unit_price": 1200, "category": "engineering"}]'::jsonb,
   true),

  -- 4. EPC → EDGE at NTP (30% of EPC contract)
  ('EPC Services — NTP (30%)', 'ntp', 'epc', 'platform',
   '[{"description": "Engineering, Procurement & Construction — NTP Milestone (30%)", "category": "epc"}]'::jsonb,
   true),

  -- 5. EPC → EDGE at Install (50% of EPC contract)
  ('EPC Services — Install (50%)', 'installation', 'epc', 'platform',
   '[{"description": "Engineering, Procurement & Construction — Install Milestone (50%)", "category": "epc"}]'::jsonb,
   true),

  -- 6. EPC → EDGE at PTO (20% of EPC contract)
  ('EPC Services — PTO (20%)', 'pto', 'epc', 'platform',
   '[{"description": "Engineering, Procurement & Construction — PTO Milestone (20%)", "category": "epc"}]'::jsonb,
   true),

  -- 7. EDGE → MicroGRID Energy (Retail Energy + VPP at $6/kWh battery/month)
  ('Retail Energy & VPP Revenue', 'monthly', 'platform', 'epc',
   '[{"description": "Retail Energy & VPP Revenue — $6/kWh battery storage capacity", "category": "energy"}]'::jsonb,
   true),

  -- 8. MicroGRID Energy → Light Energy (price TBD)
  ('Retail Energy & VPP — Light Energy', 'monthly', 'epc', 'customer',
   '[{"description": "Retail Energy & VPP Revenue (price under negotiation)", "category": "energy"}]'::jsonb,
   false)

ON CONFLICT (name) DO NOTHING;
