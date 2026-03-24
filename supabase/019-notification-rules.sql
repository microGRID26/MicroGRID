-- 019: Configurable notification rules
-- Replaces hardcoded task-status-triggered actions (e.g. Permit Drop Off note)
-- with database-driven rules that admins can manage via the Admin portal.

CREATE TABLE IF NOT EXISTS public.notification_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id TEXT NOT NULL,
  trigger_status TEXT NOT NULL,
  trigger_reason TEXT,
  action_type TEXT NOT NULL DEFAULT 'note',
  action_message TEXT NOT NULL,
  notify_role TEXT,
  active BOOLEAN DEFAULT true,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.notification_rules ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read rules (needed for ProjectPanel checks)
CREATE POLICY "notification_rules_select" ON public.notification_rules
  FOR SELECT TO authenticated USING (true);

-- Only admins can insert/update/delete
CREATE POLICY "notification_rules_insert" ON public.notification_rules
  FOR INSERT TO authenticated WITH CHECK (auth_is_admin());

CREATE POLICY "notification_rules_update" ON public.notification_rules
  FOR UPDATE TO authenticated USING (auth_is_admin());

CREATE POLICY "notification_rules_delete" ON public.notification_rules
  FOR DELETE TO authenticated USING (auth_is_super_admin());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notification_rules_task_status
  ON public.notification_rules (task_id, trigger_status)
  WHERE active = true;

-- Seed with the existing hardcoded Permit Drop Off rule
INSERT INTO public.notification_rules (task_id, trigger_status, trigger_reason, action_type, action_message, notify_role, active, created_by)
VALUES (
  'city_permit',
  'Pending Resolution',
  'Permit Drop Off/Pickup',
  'note',
  '[Scheduling Alert] City permit requires drop-off/pickup. Please schedule a service call.',
  NULL,
  true,
  'System (migrated)'
);
