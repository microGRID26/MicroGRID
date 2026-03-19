-- Performance indexes for common query patterns at scale
-- Run in Supabase SQL Editor

CREATE INDEX IF NOT EXISTS idx_projects_stage ON public.projects (stage);
CREATE INDEX IF NOT EXISTS idx_projects_disposition ON public.projects (disposition);
CREATE INDEX IF NOT EXISTS idx_projects_financier ON public.projects (financier);
CREATE INDEX IF NOT EXISTS idx_schedule_date ON public.schedule (date);
CREATE INDEX IF NOT EXISTS idx_service_calls_status ON public.service_calls (status);
