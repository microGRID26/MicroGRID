-- Migration 065: Editable permission matrix
-- Stores feature-role permission mappings in DB instead of hardcoded

CREATE TABLE IF NOT EXISTS permission_matrix (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature TEXT NOT NULL,
  role TEXT NOT NULL,
  access TEXT NOT NULL DEFAULT '—', -- 'R', 'W', 'RW', 'D', 'RWD', 'R*', '—'
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(feature, role)
);

CREATE INDEX IF NOT EXISTS idx_perm_matrix_feature ON permission_matrix(feature);

ALTER TABLE permission_matrix ENABLE ROW LEVEL SECURITY;
CREATE POLICY "perm_matrix_select" ON permission_matrix FOR SELECT TO authenticated USING (true);
CREATE POLICY "perm_matrix_write" ON permission_matrix FOR INSERT TO authenticated WITH CHECK (auth_is_admin());
CREATE POLICY "perm_matrix_update" ON permission_matrix FOR UPDATE TO authenticated USING (auth_is_admin());
CREATE POLICY "perm_matrix_delete" ON permission_matrix FOR DELETE TO authenticated USING (auth_is_super_admin());

-- Seed with current permissions + new features
INSERT INTO permission_matrix (feature, role, access, sort_order) VALUES
  -- View projects
  ('View Projects', 'sales', 'R*', 1), ('View Projects', 'user', 'R', 1), ('View Projects', 'manager', 'R', 1), ('View Projects', 'finance', 'R', 1), ('View Projects', 'admin', 'R', 1), ('View Projects', 'super_admin', 'R', 1),
  -- Edit projects
  ('Edit Projects', 'sales', '—', 2), ('Edit Projects', 'user', 'W', 2), ('Edit Projects', 'manager', 'W', 2), ('Edit Projects', 'finance', 'W', 2), ('Edit Projects', 'admin', 'W', 2), ('Edit Projects', 'super_admin', 'W', 2),
  -- Create projects
  ('Create Projects', 'sales', '—', 3), ('Create Projects', 'user', 'W', 3), ('Create Projects', 'manager', 'W', 3), ('Create Projects', 'finance', 'W', 3), ('Create Projects', 'admin', 'W', 3), ('Create Projects', 'super_admin', 'W', 3),
  -- Cancel / Reactivate
  ('Cancel / Reactivate', 'sales', '—', 4), ('Cancel / Reactivate', 'user', '—', 4), ('Cancel / Reactivate', 'manager', '—', 4), ('Cancel / Reactivate', 'finance', '—', 4), ('Cancel / Reactivate', 'admin', 'W', 4), ('Cancel / Reactivate', 'super_admin', 'W', 4),
  -- Delete projects
  ('Delete Projects', 'sales', '—', 5), ('Delete Projects', 'user', '—', 5), ('Delete Projects', 'manager', '—', 5), ('Delete Projects', 'finance', '—', 5), ('Delete Projects', 'admin', '—', 5), ('Delete Projects', 'super_admin', 'D', 5),
  -- Set blockers
  ('Set Blockers', 'sales', '—', 6), ('Set Blockers', 'user', 'W', 6), ('Set Blockers', 'manager', 'W', 6), ('Set Blockers', 'finance', 'W', 6), ('Set Blockers', 'admin', 'W', 6), ('Set Blockers', 'super_admin', 'W', 6),
  -- Task management
  ('Task Management', 'sales', 'R', 7), ('Task Management', 'user', 'R', 7), ('Task Management', 'manager', 'RW', 7), ('Task Management', 'finance', 'RW', 7), ('Task Management', 'admin', 'RW', 7), ('Task Management', 'super_admin', 'RW', 7),
  -- Notes
  ('Notes', 'sales', 'W', 8), ('Notes', 'user', 'W', 8), ('Notes', 'manager', 'W', 8), ('Notes', 'finance', 'W', 8), ('Notes', 'admin', 'W', 8), ('Notes', 'super_admin', 'W', 8),
  -- Bulk operations
  ('Bulk Operations', 'sales', '—', 9), ('Bulk Operations', 'user', 'W', 9), ('Bulk Operations', 'manager', 'W', 9), ('Bulk Operations', 'finance', 'W', 9), ('Bulk Operations', 'admin', 'W', 9), ('Bulk Operations', 'super_admin', 'W', 9),
  -- Change orders
  ('Change Orders', 'sales', '—', 10), ('Change Orders', 'user', 'RW', 10), ('Change Orders', 'manager', 'RW', 10), ('Change Orders', 'finance', 'RW', 10), ('Change Orders', 'admin', 'RW', 10), ('Change Orders', 'super_admin', 'RW', 10),
  -- Schedule
  ('Schedule', 'sales', 'R*', 11), ('Schedule', 'user', 'RW', 11), ('Schedule', 'manager', 'RW', 11), ('Schedule', 'finance', 'RW', 11), ('Schedule', 'admin', 'RW', 11), ('Schedule', 'super_admin', 'RW', 11),
  -- Analytics
  ('Analytics', 'sales', '—', 12), ('Analytics', 'user', '—', 12), ('Analytics', 'manager', 'R', 12), ('Analytics', 'finance', 'R', 12), ('Analytics', 'admin', 'R', 12), ('Analytics', 'super_admin', 'R', 12),
  -- Funding
  ('Funding', 'sales', '—', 13), ('Funding', 'user', 'R', 13), ('Funding', 'manager', 'R', 13), ('Funding', 'finance', 'RW', 13), ('Funding', 'admin', 'RW', 13), ('Funding', 'super_admin', 'RW', 13),
  -- Tickets
  ('Tickets', 'sales', '—', 14), ('Tickets', 'user', '—', 14), ('Tickets', 'manager', 'RW', 14), ('Tickets', 'finance', 'RW', 14), ('Tickets', 'admin', 'RW', 14), ('Tickets', 'super_admin', 'RW', 14),
  -- Inventory
  ('Inventory', 'sales', '—', 15), ('Inventory', 'user', '—', 15), ('Inventory', 'manager', 'RW', 15), ('Inventory', 'finance', 'RW', 15), ('Inventory', 'admin', 'RW', 15), ('Inventory', 'super_admin', 'RWD', 15),
  -- Work Orders
  ('Work Orders', 'sales', '—', 16), ('Work Orders', 'user', '—', 16), ('Work Orders', 'manager', 'RW', 16), ('Work Orders', 'finance', 'R', 16), ('Work Orders', 'admin', 'RW', 16), ('Work Orders', 'super_admin', 'RW', 16),
  -- Documents
  ('Documents', 'sales', '—', 17), ('Documents', 'user', 'R', 17), ('Documents', 'manager', 'R', 17), ('Documents', 'finance', 'R', 17), ('Documents', 'admin', 'RW', 17), ('Documents', 'super_admin', 'RW', 17),
  -- Warranty
  ('Warranty', 'sales', '—', 18), ('Warranty', 'user', '—', 18), ('Warranty', 'manager', 'RW', 18), ('Warranty', 'finance', 'R', 18), ('Warranty', 'admin', 'RW', 18), ('Warranty', 'super_admin', 'RWD', 18),
  -- Fleet
  ('Fleet', 'sales', '—', 19), ('Fleet', 'user', '—', 19), ('Fleet', 'manager', 'RW', 19), ('Fleet', 'finance', 'R', 19), ('Fleet', 'admin', 'RW', 19), ('Fleet', 'super_admin', 'RWD', 19),
  -- Vendors
  ('Vendors', 'sales', '—', 20), ('Vendors', 'user', '—', 20), ('Vendors', 'manager', 'RW', 20), ('Vendors', 'finance', 'R', 20), ('Vendors', 'admin', 'RW', 20), ('Vendors', 'super_admin', 'RWD', 20),
  -- Permits
  ('Permits', 'sales', '—', 21), ('Permits', 'user', '—', 21), ('Permits', 'manager', 'R', 21), ('Permits', 'finance', '—', 21), ('Permits', 'admin', 'RW', 21), ('Permits', 'super_admin', 'RW', 21),
  -- Sales Teams
  ('Sales Teams', 'sales', 'R*', 22), ('Sales Teams', 'user', '—', 22), ('Sales Teams', 'manager', 'R', 22), ('Sales Teams', 'finance', 'R', 22), ('Sales Teams', 'admin', 'RW', 22), ('Sales Teams', 'super_admin', 'RW', 22),
  -- Commissions
  ('Commissions', 'sales', 'R*', 23), ('Commissions', 'user', '—', 23), ('Commissions', 'manager', 'R', 23), ('Commissions', 'finance', 'RW', 23), ('Commissions', 'admin', 'RW', 23), ('Commissions', 'super_admin', 'RW', 23),
  -- Invoices
  ('Invoices', 'sales', '—', 24), ('Invoices', 'user', '—', 24), ('Invoices', 'manager', 'R', 24), ('Invoices', 'finance', 'RW', 24), ('Invoices', 'admin', 'RW', 24), ('Invoices', 'super_admin', 'RW', 24),
  -- Engineering
  ('Engineering', 'sales', '—', 25), ('Engineering', 'user', '—', 25), ('Engineering', 'manager', 'RW', 25), ('Engineering', 'finance', 'R', 25), ('Engineering', 'admin', 'RW', 25), ('Engineering', 'super_admin', 'RW', 25),
  -- NTP
  ('NTP Workflow', 'sales', '—', 26), ('NTP Workflow', 'user', '—', 26), ('NTP Workflow', 'manager', 'RW', 26), ('NTP Workflow', 'finance', 'R', 26), ('NTP Workflow', 'admin', 'RW', 26), ('NTP Workflow', 'super_admin', 'RW', 26),
  -- Project Map
  ('Project Map', 'sales', '—', 27), ('Project Map', 'user', '—', 27), ('Project Map', 'manager', 'R', 27), ('Project Map', 'finance', 'R', 27), ('Project Map', 'admin', 'R', 27), ('Project Map', 'super_admin', 'R', 27),
  -- Legacy
  ('Legacy Projects', 'sales', '—', 28), ('Legacy Projects', 'user', 'R', 28), ('Legacy Projects', 'manager', 'R', 28), ('Legacy Projects', 'finance', 'R', 28), ('Legacy Projects', 'admin', 'R', 28), ('Legacy Projects', 'super_admin', 'R', 28),
  -- Admin portal
  ('Admin Portal', 'sales', '—', 29), ('Admin Portal', 'user', '—', 29), ('Admin Portal', 'manager', '—', 29), ('Admin Portal', 'finance', '—', 29), ('Admin Portal', 'admin', 'RW', 29), ('Admin Portal', 'super_admin', 'RW', 29),
  -- System page
  ('System Settings', 'sales', '—', 30), ('System Settings', 'user', '—', 30), ('System Settings', 'manager', '—', 30), ('System Settings', 'finance', '—', 30), ('System Settings', 'admin', '—', 30), ('System Settings', 'super_admin', 'RW', 30),
  -- Manage users
  ('Manage Users', 'sales', '—', 31), ('Manage Users', 'user', '—', 31), ('Manage Users', 'manager', '—', 31), ('Manage Users', 'finance', '—', 31), ('Manage Users', 'admin', 'RW', 31), ('Manage Users', 'super_admin', 'RW', 31),
  -- Delete entities
  ('Delete Entities', 'sales', '—', 32), ('Delete Entities', 'user', '—', 32), ('Delete Entities', 'manager', '—', 32), ('Delete Entities', 'finance', '—', 32), ('Delete Entities', 'admin', '—', 32), ('Delete Entities', 'super_admin', 'D', 32),
  -- Audit trail
  ('Audit Trail', 'sales', '—', 33), ('Audit Trail', 'user', '—', 33), ('Audit Trail', 'manager', '—', 33), ('Audit Trail', 'finance', '—', 33), ('Audit Trail', 'admin', 'R', 33), ('Audit Trail', 'super_admin', 'R', 33)
ON CONFLICT (feature, role) DO NOTHING;
