-- 196b-backfill-public-users-id-hotfix-org-memberships.sql
-- Hotfix to migration 196 (applied 2026-04-29 ~17:30 CDT).
-- Mig 196 missed `org_memberships.user_id` in its column scan, leaving 10 orphan rows
-- pointing at the old pub_ids. The 4 admins among the 10 are masked by auth_is_admin()
-- short-circuit, but the 6 non-admin users (Mike White, Whitney, Tabitha, Diego, Heidi,
-- Jennifer) lose org-scoped access on policies that don't have an admin OR-leg.
--
-- Found by red-teamer audit immediately after mig 196 applied. Recovered the old→new
-- map from this session's earlier discovery query (the 10 IDs are documented in the
-- session recap and audit chain).
--
-- This migration also creates a permanent audit table preserving the old→new map
-- so any FUTURE columns we discover later can be retro-fixed without recomputation.

-- 1. Persist the map (defense-in-depth for future audit / undiscovered columns)
CREATE TABLE IF NOT EXISTS public.migration_196_user_id_map (
  email text PRIMARY KEY,
  old_id uuid NOT NULL,
  new_id uuid NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.migration_196_user_id_map (email, old_id, new_id) VALUES
  ('hhildreth@gomicrogridenergy.com', '6b84dbc4-eafa-4106-8464-1728b958d3c6', '2492c122-df08-41ad-9f8f-532ac1b1e2e3'),
  ('jharper@gomicrogridenergy.com',   '8fff2480-2aac-429a-8645-c304c94fadd0', '4a80f1cf-c478-4373-a972-bc85abc5031c'),
  ('mark@energydevelopmentgroup.com', '7b79eca1-ede5-4388-ae0b-ea64cb0e0176', '22e2b33b-060f-49ce-abbd-68672be29345'),
  ('mwhite@gomicrogridenergy.com',    'f5040166-80b0-40c2-86f2-0b7ca7622bb5', '8ecf4a8e-a2f1-416e-94a7-35d8e71898f9'),
  ('paul@energydevelopmentgroup.com', '45dc9ad1-005f-438d-ac49-86d8c187a05a', '9244c49e-2bc2-4988-aa3f-bed74bc4561f'),
  ('wcarter@gomicrogridenergy.com',   'c181798f-e665-4806-a9a2-1bbbdff82d05', '0786e781-dd0d-4b3f-ad30-84e3d1523671'),
  ('zach@gomicrogridenergy.com',      '69e36df6-4bc4-477c-a5cd-b6440859c03d', '182f3cc0-0b0e-4e03-85a2-0d076e983b01'),
  ('tpratt@gomicrogridenergy.com',    '87ccb363-cf19-4198-8052-a69a1a368a23', '9a8026f9-a5f1-4f5e-8fe8-fb5bc68eb3b0'),
  ('drivera@gomicrogridenergy.com',   '1dad7309-812f-484a-adb9-1537f0f5ced5', '9df5ddfa-b1b5-4360-991d-c499a8e8dca5'),
  ('greg@gomicrogridenergy.com',      'a15af62e-08f8-45bd-ae48-e7095e02a6d5', '395611ed-6657-4a68-b9c9-5abb09f3bedc')
ON CONFLICT (email) DO NOTHING;

-- 2. Lock the audit table down (read-only, owner-only)
ALTER TABLE public.migration_196_user_id_map ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.migration_196_user_id_map FROM anon, authenticated;

-- 3. Fix org_memberships orphans
UPDATE public.org_memberships om
SET user_id = m.new_id
FROM public.migration_196_user_id_map m
WHERE om.user_id = m.old_id;

-- 4. Verification: zero org_memberships rows still pointing at old pub_ids
DO $$
DECLARE v_remaining int;
BEGIN
  SELECT count(*) INTO v_remaining
  FROM public.org_memberships om
  WHERE om.user_id IN (SELECT old_id FROM public.migration_196_user_id_map);
  IF v_remaining > 0 THEN
    RAISE EXCEPTION 'Hotfix failed: % org_memberships rows still hold old pub_ids', v_remaining;
  END IF;
  RAISE NOTICE 'Hotfix passed: 0 org_membership orphans remain';
END $$;

-- 5. Sanity: every active role-bearing user should now have at least one org_membership
--    that points at their NEW (post-mig-196) public.users.id.
DO $$
DECLARE v_orphans int;
BEGIN
  SELECT count(*) INTO v_orphans
  FROM public.users u
  WHERE u.active = true AND u.role IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.org_memberships om WHERE om.user_id = u.id
    )
    AND u.email IN (SELECT email FROM public.migration_196_user_id_map);

  IF v_orphans > 0 THEN
    RAISE EXCEPTION 'Sanity check failed: % migrated users have NO matching org_membership', v_orphans;
  END IF;
  RAISE NOTICE 'Sanity check passed: all 10 migrated users have an aligned org_membership';
END $$;
