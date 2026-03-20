-- ============================================================================
-- PM ID Migration: Add pm_id columns, backfill from users, update RLS
-- Run in Supabase SQL Editor
-- ============================================================================

-- Step 1: Add pm_id columns
ALTER TABLE projects ADD COLUMN IF NOT EXISTS pm_id TEXT;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS pm_id TEXT;
ALTER TABLE schedule ADD COLUMN IF NOT EXISTS pm_id TEXT;
ALTER TABLE service_calls ADD COLUMN IF NOT EXISTS pm_id TEXT;

-- Step 2: Backfill pm_id from users.name → users.id
UPDATE projects SET pm_id = u.id::text FROM users u WHERE projects.pm = u.name AND projects.pm_id IS NULL;
UPDATE notes SET pm_id = u.id::text FROM users u WHERE notes.pm = u.name AND notes.pm_id IS NULL;
UPDATE schedule SET pm_id = u.id::text FROM users u WHERE schedule.pm = u.name AND schedule.pm_id IS NULL;
UPDATE service_calls SET pm_id = u.id::text FROM users u WHERE service_calls.pm = u.name AND service_calls.pm_id IS NULL;

-- Step 3: Index
CREATE INDEX IF NOT EXISTS idx_projects_pm_id ON projects (pm_id);

-- Step 4: New RLS helper
CREATE OR REPLACE FUNCTION public.auth_user_id()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT id::text FROM public.users WHERE email = auth.email() LIMIT 1;
$$;

-- Step 5: Update cascade trigger to use pm_id
CREATE OR REPLACE FUNCTION public.cascade_user_name_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF OLD.name IS DISTINCT FROM NEW.name THEN
    UPDATE projects SET pm = NEW.name WHERE pm_id = OLD.id::text;
    UPDATE notes SET pm = NEW.name WHERE pm_id = OLD.id::text;
    UPDATE schedule SET pm = NEW.name WHERE pm_id = OLD.id::text;
    UPDATE service_calls SET pm = NEW.name WHERE pm_id = OLD.id::text;
  END IF;
  RETURN NEW;
END;
$$;

-- Step 6: Update RLS policies to use pm_id
DROP POLICY IF EXISTS "projects_update" ON projects;
CREATE POLICY "projects_update" ON projects FOR UPDATE TO authenticated
  USING (pm_id = public.auth_user_id() OR public.auth_is_admin())
  WITH CHECK (pm_id = public.auth_user_id() OR public.auth_is_admin());

DROP POLICY IF EXISTS "task_state_write" ON task_state;
CREATE POLICY "task_state_write" ON task_state FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = task_state.project_id AND (projects.pm_id = public.auth_user_id() OR public.auth_is_admin())))
  WITH CHECK (EXISTS (SELECT 1 FROM projects WHERE projects.id = task_state.project_id AND (projects.pm_id = public.auth_user_id() OR public.auth_is_admin())));

DROP POLICY IF EXISTS "notes_write" ON notes;
CREATE POLICY "notes_write" ON notes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = notes.project_id AND (projects.pm_id = public.auth_user_id() OR public.auth_is_admin())))
  WITH CHECK (EXISTS (SELECT 1 FROM projects WHERE projects.id = notes.project_id AND (projects.pm_id = public.auth_user_id() OR public.auth_is_admin())));

DROP POLICY IF EXISTS "schedule_write" ON schedule;
CREATE POLICY "schedule_write" ON schedule FOR ALL TO authenticated
  USING (pm_id = public.auth_user_id() OR public.auth_is_admin()
    OR EXISTS (SELECT 1 FROM projects WHERE projects.id = schedule.project_id AND projects.pm_id = public.auth_user_id()))
  WITH CHECK (pm_id = public.auth_user_id() OR public.auth_is_admin()
    OR EXISTS (SELECT 1 FROM projects WHERE projects.id = schedule.project_id AND projects.pm_id = public.auth_user_id()));

DROP POLICY IF EXISTS "stage_history_write" ON stage_history;
CREATE POLICY "stage_history_write" ON stage_history FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = stage_history.project_id AND (projects.pm_id = public.auth_user_id() OR public.auth_is_admin())))
  WITH CHECK (EXISTS (SELECT 1 FROM projects WHERE projects.id = stage_history.project_id AND (projects.pm_id = public.auth_user_id() OR public.auth_is_admin())));

DROP POLICY IF EXISTS "funding_write" ON project_funding;
CREATE POLICY "funding_write" ON project_funding FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = project_funding.project_id AND (projects.pm_id = public.auth_user_id() OR public.auth_is_admin())))
  WITH CHECK (EXISTS (SELECT 1 FROM projects WHERE projects.id = project_funding.project_id AND (projects.pm_id = public.auth_user_id() OR public.auth_is_admin())));

DROP POLICY IF EXISTS "service_calls_write" ON service_calls;
CREATE POLICY "service_calls_write" ON service_calls FOR ALL TO authenticated
  USING (pm_id = public.auth_user_id() OR public.auth_is_admin()
    OR EXISTS (SELECT 1 FROM projects WHERE projects.id = service_calls.project_id AND projects.pm_id = public.auth_user_id()))
  WITH CHECK (pm_id = public.auth_user_id() OR public.auth_is_admin()
    OR EXISTS (SELECT 1 FROM projects WHERE projects.id = service_calls.project_id AND projects.pm_id = public.auth_user_id()));

DROP POLICY IF EXISTS "folders_write" ON project_folders;
CREATE POLICY "folders_write" ON project_folders FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = project_folders.project_id AND (projects.pm_id = public.auth_user_id() OR public.auth_is_admin())))
  WITH CHECK (EXISTS (SELECT 1 FROM projects WHERE projects.id = project_folders.project_id AND (projects.pm_id = public.auth_user_id() OR public.auth_is_admin())));

-- Step 7: Record migration
INSERT INTO migrations_log (name, description) VALUES
  ('008_pm_id_migration', 'Add pm_id columns, backfill from users, update RLS to use pm_id')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- Verify: SELECT count(*) FROM projects WHERE pm IS NOT NULL AND pm_id IS NULL;
-- Should return 0 (all PMs backfilled)
-- ============================================================================
