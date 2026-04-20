-- Migration 132: RLS helpers resolve public.users.id via auth.email()
--
-- Closes greg_actions #141 (P0). Fixes a pre-existing bug codified but not
-- introduced by migration 130.
--
-- Problem
-- ───────
-- auth.uid() returns the auth.users.id from the JWT `sub` claim. But
-- org_memberships.user_id keys on public.users.id, and public.users.id !=
-- auth.users.id for every user in this database (the two tables grew
-- independently; emails are the only shared key).
--
-- Live probe before this migration:
--   Paul: public.users.id = 45dc9ad1-…, auth.users.id = 9244c49e-…
--         org_memberships matching public.users.id: 2  (MG Energy + EDGE)
--         org_memberships matching auth.users.id:   0
--
-- Every helper that did `WHERE om.user_id = auth.uid()` matched zero rows in
-- production. That meant:
--   - auth_user_org_ids() returned {} for every real user.
--   - auth_is_platform_user() only returned true via the auth_is_super_admin()
--     OR path.
--   - auth_is_org_member() / auth_is_org_admin() were false for everyone
--     except super_admins.
--
-- Blast radius: migration 043 wrapped 30 tables in org-scoped RLS using
-- these helpers. Those policies have been inert since inception — cross-
-- tenant isolation between MG Energy / EDGE / TriSMART was never enforced
-- at the row level. Multi-tenancy rode entirely on role-based gates
-- (auth_is_admin, auth_is_super_admin) until this migration.
--
-- Fix (Option B)
-- ──────────────
-- Rewrite the four membership-walking helpers to resolve public.users.id
-- from auth.email() first, then join on org_memberships.user_id. Keeps
-- existing data shape; no backfill of org_memberships needed.
--
-- Active-gate from migration 130 is preserved (filter u.active = true at
-- the resolver step).
--
-- Pre-migration drift-check results (zero blockers):
--   - 1 active public.users with no auth.users: aaron@gomicrogridenergy.com
--     (he has zero access today under the broken helper and still zero
--     under Option B until he completes OAuth — filed as P1 #142).
--   - 7 auth.users with no public.users: dormant, non-exploitable.
--   - 0 case-mismatch pairs.
--   - 2 orphan org_memberships keyed on Greg's auth.users.id (not
--     public.users.id). Dropped below — they were invisible under both the
--     old and new helper shapes and would be an exploitable landmine if
--     any future code resolved memberships via auth.uid().
--
-- Not addressed here (filed separately):
--   - P1 #142: Aaron's OAuth onboarding.
--   - P2 #143: NULL-active failsafe flip (COALESCE(active,true) → NOT NULL
--     DEFAULT true on the column).

-- ── 1. Drop 2 orphan memberships keyed on auth.users.id ───────────────────
-- Belt-and-suspenders: remove any org_membership whose user_id doesn't
-- resolve to a public.users row. Today this is exactly 2 rows (both Greg's
-- own auth.users.id, EDGE + MG Energy). The DELETE is idempotent.
DELETE FROM public.org_memberships om
WHERE NOT EXISTS (
  SELECT 1 FROM public.users u WHERE u.id = om.user_id
);

-- ── 2. auth_user_org_ids: resolve via email ───────────────────────────────
-- Preserve the transaction-scoped cache and the active gate from 130.
-- The resolver step (SELECT id FROM public.users WHERE email = auth.email()
-- AND active = true) returns NULL for inactive / missing users, short-
-- circuiting the membership walk to an empty array.
CREATE OR REPLACE FUNCTION public.auth_user_org_ids()
RETURNS UUID[] LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  cached         TEXT;
  result         UUID[];
  v_public_uid   uuid;
BEGIN
  BEGIN
    cached := current_setting('app.user_org_ids', true);
  EXCEPTION WHEN OTHERS THEN
    cached := NULL;
  END;

  IF cached IS NOT NULL AND cached != '' THEN
    RETURN cached::UUID[];
  END IF;

  -- Resolve public.users.id from auth.email(). Returns NULL for inactive
  -- or missing users -> empty org array.
  SELECT u.id INTO v_public_uid
    FROM public.users u
    WHERE lower(u.email) = lower(auth.email())
      AND COALESCE(u.active, true) = true
    LIMIT 1;

  IF v_public_uid IS NULL THEN
    PERFORM set_config('app.user_org_ids', '{}', true);
    RETURN '{}'::UUID[];
  END IF;

  SELECT COALESCE(
    ARRAY(SELECT org_id FROM public.org_memberships WHERE user_id = v_public_uid),
    '{}'::UUID[]
  ) INTO result;

  PERFORM set_config('app.user_org_ids', result::TEXT, true);
  RETURN result;
END;
$$;

-- ── 3. auth_is_platform_user: resolve via email ──────────────────────────
CREATE OR REPLACE FUNCTION public.auth_is_platform_user()
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  cached       TEXT;
  result       BOOLEAN;
  v_public_uid uuid;
BEGIN
  BEGIN
    cached := current_setting('app.is_platform_user', true);
  EXCEPTION WHEN OTHERS THEN
    cached := NULL;
  END;

  IF cached IS NOT NULL AND cached != '' THEN
    RETURN cached::BOOLEAN;
  END IF;

  SELECT u.id INTO v_public_uid
    FROM public.users u
    WHERE lower(u.email) = lower(auth.email())
      AND COALESCE(u.active, true) = true
    LIMIT 1;

  IF v_public_uid IS NULL THEN
    -- Super-admin OR-branch still applies (a super_admin with a public.users
    -- row would have resolved above; one without won't reach super_admin
    -- either since auth_is_super_admin() also keys on email+active).
    result := public.auth_is_super_admin();
    PERFORM set_config('app.is_platform_user', result::TEXT, true);
    RETURN result;
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.org_memberships om
    JOIN public.organizations o ON o.id = om.org_id
    WHERE om.user_id = v_public_uid AND o.org_type = 'platform'
  ) OR public.auth_is_super_admin() INTO result;

  PERFORM set_config('app.is_platform_user', result::TEXT, true);
  RETURN result;
END;
$$;

-- ── 4. auth_is_org_member / auth_is_org_admin: resolve via email ─────────
CREATE OR REPLACE FUNCTION public.auth_is_org_member(target_org_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT EXISTS(
    SELECT 1
    FROM public.org_memberships om
    JOIN public.users u ON u.id = om.user_id
    WHERE lower(u.email) = lower(auth.email())
      AND COALESCE(u.active, true) = true
      AND om.org_id = target_org_id
  );
$$;

CREATE OR REPLACE FUNCTION public.auth_is_org_admin(target_org_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT EXISTS(
    SELECT 1
    FROM public.org_memberships om
    JOIN public.users u ON u.id = om.user_id
    WHERE lower(u.email) = lower(auth.email())
      AND COALESCE(u.active, true) = true
      AND om.org_id = target_org_id
      AND om.org_role IN ('owner', 'admin')
  ) OR public.auth_is_super_admin();
$$;

-- ── 5. Role-based helpers: case-insensitive email match ──────────────────
-- R2 caught that auth_is_admin / auth_is_super_admin / auth_user_role (from
-- migration 130) and auth_is_internal_writer (from migration 117) all use
-- plain `email = auth.email()`. Same IdP-casing-drift lockout risk as the
-- four helpers above. Fix with the same lower()/lower() pattern, leveraging
-- the existing users_email_idx on lower(email).
CREATE OR REPLACE FUNCTION public.auth_is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT role IN ('admin', 'super_admin')
       FROM public.users
      WHERE lower(email) = lower(auth.email())
        AND COALESCE(active, true) = true
      LIMIT 1),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.auth_is_super_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT role = 'super_admin'
       FROM public.users
      WHERE lower(email) = lower(auth.email())
        AND COALESCE(active, true) = true
      LIMIT 1),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.auth_user_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT role
       FROM public.users
      WHERE lower(email) = lower(auth.email())
        AND COALESCE(active, true) = true
      LIMIT 1),
    'user'
  );
$$;

CREATE OR REPLACE FUNCTION public.auth_is_internal_writer()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public, extensions, pg_catalog
AS $$
  SELECT COALESCE(
    (SELECT
       COALESCE(u.active, true) = true
       AND u.role IS NOT NULL
       AND u.role IN ('super_admin', 'admin', 'finance', 'manager', 'user', 'sales')
     FROM public.users u
     WHERE lower(u.email) = lower(auth.email())
     LIMIT 1),
    false
  );
$$;

COMMENT ON FUNCTION public.auth_user_org_ids() IS
  'RLS helper: resolves public.users.id from auth.email() (two-UUID-space reality: auth.uid() != public.users.id in this DB). Returns {} for inactive/missing users. Case-insensitive email match. Transaction-cached via app.user_org_ids GUC.';
COMMENT ON FUNCTION public.auth_is_platform_user() IS
  'RLS helper: true when the authenticated user (resolved via email, case-insensitive) is active with a platform-org membership OR is a super admin.';
COMMENT ON FUNCTION public.auth_is_org_member(UUID) IS
  'RLS helper: true when the authenticated user (resolved via email, case-insensitive) has an active membership in target_org_id.';
COMMENT ON FUNCTION public.auth_is_org_admin(UUID) IS
  'RLS helper: true when the authenticated user (resolved via email, case-insensitive) is an owner/admin of target_org_id OR is a super admin.';
COMMENT ON FUNCTION public.auth_is_admin() IS
  'RLS helper: true when auth.email() maps to an active users row with role admin|super_admin. Case-insensitive email match.';
COMMENT ON FUNCTION public.auth_is_super_admin() IS
  'RLS helper: true when auth.email() maps to an active users row with role=super_admin. Case-insensitive email match.';
