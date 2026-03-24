-- 017-financiers.sql — Financier reference table
-- Mirrors pattern from hoas table

CREATE TABLE IF NOT EXISTS public.financiers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  phone text,
  website text,
  contact_name text,
  contact_email text,
  notes text
);

-- Index on name for autocomplete search
CREATE INDEX IF NOT EXISTS idx_financiers_name ON public.financiers (name);

-- RLS: read for all authenticated, write for all authenticated
ALTER TABLE public.financiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "financiers_select" ON public.financiers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "financiers_insert" ON public.financiers
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "financiers_update" ON public.financiers
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "financiers_delete" ON public.financiers
  FOR DELETE TO authenticated USING (auth_is_super_admin());

-- Seed with existing financier names used in the codebase
INSERT INTO public.financiers (name) VALUES
  ('Cash'),
  ('EDGE'),
  ('Mosaic'),
  ('Sungage'),
  ('GoodLeap'),
  ('Dividend'),
  ('Sunrun'),
  ('Tesla'),
  ('Sunnova'),
  ('Loanpal')
ON CONFLICT DO NOTHING;
