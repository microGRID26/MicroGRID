-- 026-purchase-orders.sql — Purchase order tracking
-- Phase 2 of Inventory Management System

CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  po_number TEXT NOT NULL UNIQUE,
  vendor TEXT NOT NULL,
  project_id TEXT, -- optional, can be multi-project
  status TEXT DEFAULT 'draft', -- draft, submitted, confirmed, shipped, delivered, cancelled
  total_amount NUMERIC,
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  tracking_number TEXT,
  expected_delivery DATE
);

CREATE TABLE IF NOT EXISTS public.po_line_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  po_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  material_id UUID REFERENCES project_materials(id),
  equipment_id UUID REFERENCES equipment(id),
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC,
  total_price NUMERIC,
  notes TEXT
);

CREATE INDEX idx_po_status ON purchase_orders(status);
CREATE INDEX idx_po_vendor ON purchase_orders(vendor);
CREATE INDEX idx_po_project ON purchase_orders(project_id);
CREATE INDEX idx_po_line_items_po ON po_line_items(po_id);

ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "po_select" ON purchase_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "po_insert" ON purchase_orders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "po_update" ON purchase_orders FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE po_line_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "po_items_select" ON po_line_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "po_items_insert" ON po_line_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "po_items_update" ON po_line_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "po_items_delete" ON po_line_items FOR DELETE TO authenticated USING (true);
