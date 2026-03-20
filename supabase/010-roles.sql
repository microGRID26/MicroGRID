-- 010-roles.sql — Replace admin/super_admin booleans with a single role column
-- Roles: super_admin (5), admin (4), finance (3), manager (2), user (1)

-- Add role column with default 'user'
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- Backfill from existing booleans
UPDATE users SET role = 'super_admin' WHERE super_admin = true;
UPDATE users SET role = 'admin' WHERE admin = true AND (super_admin IS NULL OR super_admin = false);

-- Update auth_is_admin to check role instead of admin boolean
CREATE OR REPLACE FUNCTION public.auth_is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT role IN ('admin', 'super_admin') FROM public.users WHERE email = auth.email() LIMIT 1),
    false
  );
$$;

-- New: check if super admin
CREATE OR REPLACE FUNCTION public.auth_is_super_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT role = 'super_admin' FROM public.users WHERE email = auth.email() LIMIT 1),
    false
  );
$$;

-- New: get user's role
CREATE OR REPLACE FUNCTION public.auth_user_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT role FROM public.users WHERE email = auth.email() LIMIT 1),
    'user'
  );
$$;
