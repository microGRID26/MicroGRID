-- 027-warehouse-transactions.sql — Track warehouse check-out/check-in/adjustment transactions
-- Phase 3 of Inventory Management System

CREATE TABLE IF NOT EXISTS public.warehouse_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stock_id UUID NOT NULL REFERENCES warehouse_stock(id),
  project_id TEXT,
  transaction_type TEXT NOT NULL, -- checkout, checkin, adjustment, recount
  quantity INTEGER NOT NULL,
  notes TEXT,
  performed_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_wh_transactions_stock ON warehouse_transactions(stock_id);
CREATE INDEX idx_wh_transactions_project ON warehouse_transactions(project_id);
CREATE INDEX idx_wh_transactions_type ON warehouse_transactions(transaction_type);
ALTER TABLE warehouse_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wht_select" ON warehouse_transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "wht_insert" ON warehouse_transactions FOR INSERT TO authenticated WITH CHECK (true);
