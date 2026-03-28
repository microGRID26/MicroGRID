-- 040-org-id-on-tables.sql — Add nullable org_id to core tables
-- Phase 1: Backward compatible — nullable, no RLS changes yet

-- Core tables that need direct org_id
ALTER TABLE projects ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
ALTER TABLE crews ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
ALTER TABLE warehouse_stock ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);

-- Per-org configurable tables
ALTER TABLE task_reasons ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
ALTER TABLE notification_rules ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
ALTER TABLE queue_sections ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
ALTER TABLE document_requirements ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);

-- Indexes for org_id lookups
CREATE INDEX IF NOT EXISTS idx_projects_org ON projects(org_id);
CREATE INDEX IF NOT EXISTS idx_crews_org ON crews(org_id);
CREATE INDEX IF NOT EXISTS idx_ws_org ON warehouse_stock(org_id);
CREATE INDEX IF NOT EXISTS idx_vendors_org ON vendors(org_id);
CREATE INDEX IF NOT EXISTS idx_tr_org ON task_reasons(org_id);
CREATE INDEX IF NOT EXISTS idx_nr_org ON notification_rules(org_id);
CREATE INDEX IF NOT EXISTS idx_qs_org ON queue_sections(org_id);
CREATE INDEX IF NOT EXISTS idx_dr_org ON document_requirements(org_id);

-- Composite index for project queries scoped by org + stage
CREATE INDEX IF NOT EXISTS idx_projects_org_stage ON projects(org_id, stage);

-- Composite index for RLS lookups on project_id tables
CREATE INDEX IF NOT EXISTS idx_projects_id_org ON projects(id, org_id);
