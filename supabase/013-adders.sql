-- ============================================================================
-- 013-adders.sql — Project adders table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.project_adders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  adder_name TEXT NOT NULL,
  price NUMERIC,
  total_amount NUMERIC,
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.project_adders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "adders_read" ON public.project_adders FOR SELECT TO authenticated USING (true);
CREATE POLICY "adders_write" ON public.project_adders FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Index
CREATE INDEX IF NOT EXISTS idx_project_adders_project_id ON public.project_adders(project_id);

INSERT INTO migrations_log (name, description) VALUES
  ('013_adders', 'Project adders table for tracking per-project adder items and costs')
ON CONFLICT (name) DO NOTHING;
