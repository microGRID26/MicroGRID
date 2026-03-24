-- 020: Configurable queue sections
-- Replaces hardcoded queue section definitions in /queue with
-- database-driven config that admins can manage via the Admin portal.

CREATE TABLE IF NOT EXISTS public.queue_sections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  label TEXT NOT NULL,
  task_id TEXT NOT NULL,
  match_status TEXT NOT NULL,
  color TEXT DEFAULT 'gray',
  icon TEXT DEFAULT '📋',
  sort_order INT DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.queue_sections ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read (needed by queue page)
CREATE POLICY "queue_sections_select" ON public.queue_sections
  FOR SELECT TO authenticated USING (true);

-- Only admins can insert/update/delete
CREATE POLICY "queue_sections_insert" ON public.queue_sections
  FOR INSERT TO authenticated WITH CHECK (auth_is_admin());

CREATE POLICY "queue_sections_update" ON public.queue_sections
  FOR UPDATE TO authenticated USING (auth_is_admin());

CREATE POLICY "queue_sections_delete" ON public.queue_sections
  FOR DELETE TO authenticated USING (auth_is_super_admin());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_queue_sections_sort
  ON public.queue_sections (sort_order)
  WHERE active = true;

-- Seed with current hardcoded sections
INSERT INTO public.queue_sections (label, task_id, match_status, color, icon, sort_order, active) VALUES
  ('City Permit Approval — Ready to Start', 'city_permit', 'Ready To Start', 'blue', '📋', 1, true),
  ('City Permit — Submitted, Pending Approval', 'city_permit', 'In Progress,Scheduled,Pending Resolution,Revision Required', 'indigo', '📄', 2, true),
  ('Utility Permit — Submitted, Pending Approval', 'util_permit', 'In Progress,Scheduled,Pending Resolution,Revision Required', 'purple', '📄', 3, true),
  ('Utility Inspection — Ready to Start', 'util_insp', 'Ready To Start', 'teal', '⚡', 4, true),
  ('Utility Inspection — Submitted, Pending Approval', 'util_insp', 'In Progress,Scheduled,Pending Resolution,Revision Required', 'cyan', '⚡', 5, true);
