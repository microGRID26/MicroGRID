-- Migration 064: Ticketing System
-- Replaces the flat service_calls page with a structured, data-driven ticketing system.
-- Modeled after Monday.com / NetSuite case management with MicroGRID-specific additions.

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. TICKETS — Core ticket table (replaces service_calls for new tickets)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT UNIQUE NOT NULL,  -- TKT-YYYYMMDD-NNN format
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,

  -- Classification (all queryable, all filterable)
  category TEXT NOT NULL DEFAULT 'service',  -- service, sales, billing, warranty, permitting, installation, design, other
  subcategory TEXT,                           -- more specific: 'panel_damage', 'wrong_equipment', 'permit_delay', etc.
  priority TEXT NOT NULL DEFAULT 'normal',    -- low, normal, high, urgent, critical
  source TEXT DEFAULT 'internal',             -- internal, customer_call, customer_email, field_report, inspection, warranty_claim

  -- Description
  title TEXT NOT NULL,
  description TEXT,

  -- Status lifecycle
  status TEXT NOT NULL DEFAULT 'open',        -- open, assigned, in_progress, waiting_on_customer, waiting_on_vendor, escalated, resolved, closed
  resolution_category TEXT,                   -- fixed, replaced, refunded, no_action_needed, duplicate, customer_error, vendor_fault, design_error
  resolution_notes TEXT,

  -- Assignment
  assigned_to TEXT,        -- user name
  assigned_to_id UUID,     -- user UUID
  assigned_team TEXT,       -- team name (operations, sales, engineering, etc.)
  escalated_to TEXT,        -- escalation target name
  escalated_at TIMESTAMPTZ,

  -- People linkage (data-driven: who caused it, who reported it, who owns the project)
  reported_by TEXT,
  reported_by_id UUID,
  sales_rep_id UUID REFERENCES sales_reps(id),  -- for sales-related tickets
  pm_id UUID,               -- project manager

  -- SLA tracking
  sla_response_hours INTEGER DEFAULT 24,   -- target response time
  sla_resolution_hours INTEGER DEFAULT 72, -- target resolution time
  first_response_at TIMESTAMPTZ,           -- when someone first responded
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,

  -- Metadata
  tags TEXT[],              -- free-form tags for ad-hoc categorization
  related_ticket_id UUID REFERENCES tickets(id),  -- link to related/parent ticket
  org_id UUID REFERENCES organizations(id),
  created_by TEXT,
  created_by_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_tickets_number ON tickets(ticket_number);
CREATE INDEX IF NOT EXISTS idx_tickets_project ON tickets(project_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_category ON tickets(category);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets(priority);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned ON tickets(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_tickets_sales_rep ON tickets(sales_rep_id);
CREATE INDEX IF NOT EXISTS idx_tickets_org ON tickets(org_id);
CREATE INDEX IF NOT EXISTS idx_tickets_created ON tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_resolved ON tickets(resolved_at);
CREATE INDEX IF NOT EXISTS idx_tickets_sla ON tickets(status, created_at) WHERE status NOT IN ('resolved', 'closed');

-- Auto-update timestamp
CREATE TRIGGER tickets_updated_at
  BEFORE UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. TICKET_COMMENTS — Timestamped conversation thread per ticket
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS ticket_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  author_id UUID,
  message TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,  -- internal notes vs customer-visible
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket ON ticket_comments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_created ON ticket_comments(ticket_id, created_at);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. TICKET_HISTORY — Full audit trail of every field change
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS ticket_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  field TEXT NOT NULL,       -- 'status', 'priority', 'assigned_to', 'category', etc.
  old_value TEXT,
  new_value TEXT,
  changed_by TEXT NOT NULL,
  changed_by_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_history_ticket ON ticket_history(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_history_field ON ticket_history(field);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. TICKET_CATEGORIES — Admin-configurable categories and subcategories
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS ticket_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,         -- parent category
  subcategory TEXT,               -- optional subcategory
  label TEXT NOT NULL,            -- display label
  description TEXT,
  default_priority TEXT DEFAULT 'normal',
  default_sla_response INTEGER DEFAULT 24,
  default_sla_resolution INTEGER DEFAULT 72,
  active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  org_id UUID REFERENCES organizations(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_categories_active ON ticket_categories(active, sort_order);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. TICKET_RESOLUTION_CODES — Admin-configurable resolution categories
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS ticket_resolution_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  applies_to TEXT[],  -- which categories this code applies to (null = all)
  active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  org_id UUID REFERENCES organizations(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. RLS POLICIES
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_resolution_codes ENABLE ROW LEVEL SECURITY;

-- Tickets: org-scoped read, authenticated write
CREATE POLICY "tickets_select" ON tickets FOR SELECT TO authenticated
  USING (org_id IS NULL OR org_id = ANY(auth_user_org_ids()) OR auth_is_platform_user());
CREATE POLICY "tickets_insert" ON tickets FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "tickets_update" ON tickets FOR UPDATE TO authenticated USING (true);
CREATE POLICY "tickets_delete" ON tickets FOR DELETE TO authenticated USING (auth_is_super_admin());

-- Comments: inherit from ticket
CREATE POLICY "ticket_comments_select" ON ticket_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "ticket_comments_insert" ON ticket_comments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ticket_comments_delete" ON ticket_comments FOR DELETE TO authenticated USING (auth_is_admin());

-- History: read-only for all
CREATE POLICY "ticket_history_select" ON ticket_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "ticket_history_insert" ON ticket_history FOR INSERT TO authenticated WITH CHECK (true);

-- Categories + Resolution codes: all read, admin write
CREATE POLICY "ticket_categories_select" ON ticket_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "ticket_categories_write" ON ticket_categories FOR INSERT TO authenticated WITH CHECK (auth_is_admin());
CREATE POLICY "ticket_categories_update" ON ticket_categories FOR UPDATE TO authenticated USING (auth_is_admin());

CREATE POLICY "ticket_resolution_codes_select" ON ticket_resolution_codes FOR SELECT TO authenticated USING (true);
CREATE POLICY "ticket_resolution_codes_write" ON ticket_resolution_codes FOR INSERT TO authenticated WITH CHECK (auth_is_admin());
CREATE POLICY "ticket_resolution_codes_update" ON ticket_resolution_codes FOR UPDATE TO authenticated USING (auth_is_admin());

-- ═══════════════════════════════════════════════════════════════════════════════
-- 7. SEED DATA — Default categories and resolution codes
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO ticket_categories (category, subcategory, label, description, default_priority, default_sla_response, default_sla_resolution, sort_order) VALUES
  ('service', 'panel_damage', 'Panel Damage', 'Physical damage to solar panels', 'high', 12, 48, 1),
  ('service', 'inverter_failure', 'Inverter Failure', 'Inverter not functioning or error codes', 'high', 12, 48, 2),
  ('service', 'production_low', 'Low Production', 'System producing less than expected', 'normal', 24, 72, 3),
  ('service', 'monitoring_offline', 'Monitoring Offline', 'System not reporting to monitoring platform', 'normal', 24, 48, 4),
  ('service', 'roof_leak', 'Roof Leak', 'Water intrusion potentially related to installation', 'urgent', 4, 24, 5),
  ('service', 'electrical_issue', 'Electrical Issue', 'Wiring, breaker, or electrical safety concern', 'high', 8, 48, 6),
  ('service', 'pest_damage', 'Pest/Critter Damage', 'Animal damage to wiring or equipment', 'normal', 24, 72, 7),
  ('sales', 'misrepresentation', 'Sales Misrepresentation', 'Customer claims they were misled about system or pricing', 'high', 8, 48, 10),
  ('sales', 'contract_dispute', 'Contract Dispute', 'Disagreement about contract terms', 'high', 12, 72, 11),
  ('sales', 'pricing_error', 'Pricing Error', 'Incorrect pricing on proposal or contract', 'normal', 24, 48, 12),
  ('sales', 'unauthorized_sale', 'Unauthorized Sale', 'Sale made by rep not authorized to sell', 'urgent', 4, 24, 13),
  ('billing', 'incorrect_invoice', 'Incorrect Invoice', 'Invoice amount or details wrong', 'normal', 24, 48, 20),
  ('billing', 'payment_dispute', 'Payment Dispute', 'Customer disputes payment or charge', 'normal', 24, 72, 21),
  ('billing', 'funding_delay', 'Funding Delay', 'Financier payment delayed', 'normal', 48, 168, 22),
  ('warranty', 'equipment_defect', 'Equipment Defect', 'Manufacturing defect in equipment', 'high', 12, 72, 30),
  ('warranty', 'workmanship', 'Workmanship Issue', 'Installation quality problem', 'high', 12, 48, 31),
  ('warranty', 'claim_filing', 'Warranty Claim', 'Filing a warranty claim with manufacturer', 'normal', 24, 168, 32),
  ('permitting', 'permit_rejection', 'Permit Rejection', 'AHJ rejected permit application', 'high', 8, 72, 40),
  ('permitting', 'inspection_failure', 'Inspection Failure', 'Failed city or utility inspection', 'high', 8, 48, 41),
  ('permitting', 'pto_delay', 'PTO Delay', 'Permission to operate delayed by utility', 'normal', 48, 168, 42),
  ('installation', 'schedule_change', 'Schedule Change', 'Customer or crew schedule conflict', 'normal', 24, 48, 50),
  ('installation', 'site_issue', 'Site Issue', 'Unexpected site condition discovered', 'high', 12, 72, 51),
  ('installation', 'equipment_missing', 'Missing Equipment', 'Required equipment not on site', 'high', 8, 24, 52),
  ('design', 'redesign_needed', 'Redesign Needed', 'Design changes required', 'normal', 24, 72, 60),
  ('design', 'engineering_error', 'Engineering Error', 'Error in system design or calculations', 'high', 8, 48, 61),
  ('other', NULL, 'General Inquiry', 'General customer or internal inquiry', 'low', 48, 168, 99)
ON CONFLICT DO NOTHING;

INSERT INTO ticket_resolution_codes (code, label, description, applies_to, sort_order) VALUES
  ('fixed', 'Fixed / Repaired', 'Issue was repaired on site', ARRAY['service', 'installation'], 1),
  ('replaced', 'Equipment Replaced', 'Defective equipment was replaced', ARRAY['service', 'warranty'], 2),
  ('refunded', 'Refund Issued', 'Customer received refund or credit', ARRAY['sales', 'billing'], 3),
  ('redesigned', 'System Redesigned', 'System was redesigned to resolve issue', ARRAY['design', 'installation'], 4),
  ('resubmitted', 'Permit Resubmitted', 'Permit resubmitted with corrections', ARRAY['permitting'], 5),
  ('rescheduled', 'Rescheduled', 'Work was rescheduled', ARRAY['installation', 'service'], 6),
  ('vendor_resolved', 'Vendor Resolved', 'Vendor addressed the issue', ARRAY['warranty', 'billing'], 7),
  ('customer_error', 'Customer Error', 'Issue caused by customer action/misunderstanding', NULL, 8),
  ('no_action_needed', 'No Action Needed', 'Investigation found no issue', NULL, 9),
  ('duplicate', 'Duplicate Ticket', 'Duplicate of another ticket', NULL, 10),
  ('rep_disciplined', 'Rep Disciplined', 'Sales rep received corrective action', ARRAY['sales'], 11),
  ('rep_terminated', 'Rep Terminated', 'Sales rep was terminated', ARRAY['sales'], 12),
  ('escalated_external', 'Escalated to External', 'Escalated to manufacturer, utility, or AHJ', NULL, 13),
  ('warranty_claim_filed', 'Warranty Claim Filed', 'Manufacturer warranty claim submitted', ARRAY['warranty'], 14),
  ('partial_fix', 'Partial Fix', 'Issue partially resolved, follow-up needed', NULL, 15)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 8. ANALYTICS VIEW — Pre-computed ticket metrics
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW ticket_metrics AS
SELECT
  category,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE status IN ('open', 'assigned', 'in_progress', 'escalated', 'waiting_on_customer', 'waiting_on_vendor')) AS open_count,
  COUNT(*) FILTER (WHERE status IN ('resolved', 'closed')) AS resolved_count,
  COUNT(*) FILTER (WHERE priority IN ('urgent', 'critical')) AS critical_count,
  COUNT(*) FILTER (WHERE status = 'escalated') AS escalated_count,
  ROUND(AVG(
    CASE WHEN first_response_at IS NOT NULL
    THEN EXTRACT(EPOCH FROM (first_response_at - created_at)) / 3600
    END
  )::numeric, 1) AS avg_response_hours,
  ROUND(AVG(
    CASE WHEN resolved_at IS NOT NULL
    THEN EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600
    END
  )::numeric, 1) AS avg_resolution_hours,
  COUNT(*) FILTER (WHERE first_response_at IS NOT NULL AND
    EXTRACT(EPOCH FROM (first_response_at - created_at)) / 3600 > sla_response_hours) AS sla_response_breached,
  COUNT(*) FILTER (WHERE resolved_at IS NOT NULL AND
    EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600 > sla_resolution_hours) AS sla_resolution_breached
FROM tickets
GROUP BY category;
