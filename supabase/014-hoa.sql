-- 014-hoa.sql — HOA reference table
-- Mirrors pattern from ahjs/utilities tables

CREATE TABLE IF NOT EXISTS public.hoas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  phone text,
  website text,
  contact_name text,
  contact_email text,
  notes text
);

-- Index on name for autocomplete search
CREATE INDEX IF NOT EXISTS idx_hoas_name ON public.hoas (name);

-- RLS: read for all authenticated, write for all authenticated
ALTER TABLE public.hoas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hoas_select" ON public.hoas
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "hoas_insert" ON public.hoas
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "hoas_update" ON public.hoas
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "hoas_delete" ON public.hoas
  FOR DELETE TO authenticated USING (auth_is_super_admin());
