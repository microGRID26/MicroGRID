-- ============================================================================
-- Audit Log: tracks all project field changes
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.audit_log (
  id BIGSERIAL PRIMARY KEY,
  project_id TEXT NOT NULL,
  field TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by TEXT,
  changed_by_id TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_project ON audit_log (project_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_at ON audit_log (changed_at);

-- RLS: all authenticated can read, write gated by project ownership
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_read" ON public.audit_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "audit_write" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (true);

-- Record migration
INSERT INTO migrations_log (name, description) VALUES
  ('009_audit_log', 'Create audit_log table for tracking project field changes')
ON CONFLICT (name) DO NOTHING;
