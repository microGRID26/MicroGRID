-- 047-invoices.sql — Invoice engine foundation
-- Inter-org invoicing triggered by milestones (NTP approved, install complete, PTO received)

-- Invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  project_id TEXT REFERENCES public.projects(id) ON DELETE SET NULL,
  from_org UUID NOT NULL REFERENCES public.organizations(id),
  to_org UUID NOT NULL REFERENCES public.organizations(id),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'viewed', 'paid', 'overdue', 'cancelled', 'disputed')),
  milestone TEXT,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  due_date DATE,
  sent_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  paid_amount NUMERIC(12,2),
  payment_method TEXT,
  payment_reference TEXT,
  notes TEXT,
  created_by TEXT,
  created_by_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Invoice line items
CREATE TABLE IF NOT EXISTS public.invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  category TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Milestone invoice rules (configurable triggers)
CREATE TABLE IF NOT EXISTS public.invoice_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  milestone TEXT NOT NULL,
  from_org_type TEXT NOT NULL,
  to_org_type TEXT NOT NULL,
  line_items JSONB DEFAULT '[]'::jsonb,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invoices_project ON invoices(project_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_from_org ON invoices(from_org);
CREATE INDEX IF NOT EXISTS idx_invoices_to_org ON invoices(to_org);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_inv_items_invoice ON invoice_line_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_inv_rules_milestone ON invoice_rules(milestone);

-- RLS on invoices
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY invoices_select ON invoices
  FOR SELECT TO authenticated
  USING (
    from_org = ANY(auth_user_org_ids())
    OR to_org = ANY(auth_user_org_ids())
    OR auth_is_platform_user()
  );

CREATE POLICY invoices_insert ON invoices
  FOR INSERT TO authenticated
  WITH CHECK (
    from_org = ANY(auth_user_org_ids())
    OR auth_is_platform_user()
  );

CREATE POLICY invoices_update ON invoices
  FOR UPDATE TO authenticated
  USING (
    from_org = ANY(auth_user_org_ids())
    OR to_org = ANY(auth_user_org_ids())
    OR auth_is_platform_user()
  )
  WITH CHECK (
    from_org = ANY(auth_user_org_ids())
    OR to_org = ANY(auth_user_org_ids())
    OR auth_is_platform_user()
  );

CREATE POLICY invoices_delete ON invoices
  FOR DELETE TO authenticated
  USING (auth_is_platform_user() OR auth_is_super_admin());

-- RLS on line items (inherit from invoice)
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY inv_items_select ON invoice_line_items
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM invoices i WHERE i.id = invoice_id
    AND (i.from_org = ANY(auth_user_org_ids()) OR i.to_org = ANY(auth_user_org_ids()) OR auth_is_platform_user())
  ));

CREATE POLICY inv_items_insert ON invoice_line_items
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM invoices i WHERE i.id = invoice_id
    AND (i.from_org = ANY(auth_user_org_ids()) OR auth_is_platform_user())
  ));

CREATE POLICY inv_items_update ON invoice_line_items
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM invoices i WHERE i.id = invoice_id
    AND (i.from_org = ANY(auth_user_org_ids()) OR auth_is_platform_user())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM invoices i WHERE i.id = invoice_id
    AND (i.from_org = ANY(auth_user_org_ids()) OR auth_is_platform_user())
  ));

CREATE POLICY inv_items_delete ON invoice_line_items
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM invoices i WHERE i.id = invoice_id
    AND (i.from_org = ANY(auth_user_org_ids()) OR auth_is_platform_user())
  ));

-- RLS on rules (admin only write, all read)
ALTER TABLE invoice_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY inv_rules_select ON invoice_rules
  FOR SELECT TO authenticated USING (true);

CREATE POLICY inv_rules_write ON invoice_rules
  FOR ALL TO authenticated
  USING (auth_is_admin())
  WITH CHECK (auth_is_admin());

-- Updated_at triggers
CREATE OR REPLACE FUNCTION public.invoices_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS invoices_updated_at_trigger ON invoices;
CREATE TRIGGER invoices_updated_at_trigger
  BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION public.invoices_updated_at();

CREATE OR REPLACE FUNCTION public.inv_rules_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS inv_rules_updated_at_trigger ON invoice_rules;
CREATE TRIGGER inv_rules_updated_at_trigger
  BEFORE UPDATE ON invoice_rules FOR EACH ROW EXECUTE FUNCTION public.inv_rules_updated_at();
