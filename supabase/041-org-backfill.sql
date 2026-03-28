-- 041-org-backfill.sql — Create default org and backfill all existing data
-- Phase 1: All existing data assigned to MicroGRID Energy org

-- Create the default MicroGRID Energy org with a fixed UUID
INSERT INTO organizations (id, name, slug, org_type, allowed_domains, active)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'MicroGRID Energy',
  'microgrid',
  'epc',
  ARRAY['gomicrogridenergy.com', 'energydevelopmentgroup.com', 'trismartsolar.com'],
  true
) ON CONFLICT (slug) DO NOTHING;

-- Backfill all existing data to default org
UPDATE projects SET org_id = 'a0000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;
UPDATE crews SET org_id = 'a0000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;
UPDATE warehouse_stock SET org_id = 'a0000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;
UPDATE vendors SET org_id = 'a0000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;
UPDATE task_reasons SET org_id = 'a0000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;
UPDATE notification_rules SET org_id = 'a0000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;
UPDATE queue_sections SET org_id = 'a0000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;
UPDATE document_requirements SET org_id = 'a0000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;

-- Create org memberships for all active users
-- Maps existing role to org_role: super_admin→owner, admin→admin, rest→member
INSERT INTO org_memberships (user_id, org_id, org_role, is_default)
SELECT
  id::UUID,
  'a0000000-0000-0000-0000-000000000001',
  CASE
    WHEN role = 'super_admin' THEN 'owner'
    WHEN role = 'admin' THEN 'admin'
    ELSE 'member'
  END,
  true
FROM users
WHERE active = true
ON CONFLICT (user_id, org_id) DO NOTHING;
