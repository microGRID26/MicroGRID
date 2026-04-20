-- Migration 127: provision_user auto-creates org_memberships from allowed_domains
--
-- Background: provision_user (called by app/auth/callback/route.ts on first OAuth
-- login) inserts a row into public.users but does NOT touch public.org_memberships.
-- The invoices RLS policies (and many others) gate access on auth_user_org_ids()
-- which walks org_memberships. Result: a freshly-provisioned internal user has
-- zero memberships → SELECT returns 0 rows, INSERT silently denied by with_check.
--
-- Real-world hit: Paul Christodoulou (CFO, EDGE) was onboarded 2026-04-20 and
-- could not see or create any invoices. Confirmed via the invoices_select +
-- invoices_insert policies both reducing to false for users with no memberships.
--
-- Fix: provision_user now ALSO inserts an org_memberships row for every active
-- organization whose allowed_domains array contains the user's email domain.
-- Idempotent (ON CONFLICT DO NOTHING) so re-login is safe.
--
-- EDGE (org_type='platform') intentionally has empty allowed_domains — platform
-- access remains a manual bolt-on (Greg + Paul are the only platform members).
-- Only MicroGRID Energy (epc) auto-claims the three internal domains today.

CREATE OR REPLACE FUNCTION public.provision_user(p_email text, p_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_domain  text;
BEGIN
  INSERT INTO public.users (email, name, active, admin)
  VALUES (p_email, p_name, true, false)
  ON CONFLICT (email) DO NOTHING;

  SELECT id INTO v_user_id FROM public.users WHERE email = p_email LIMIT 1;
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  v_domain := split_part(p_email, '@', 2);
  IF v_domain IS NULL OR v_domain = '' THEN
    RETURN;
  END IF;

  INSERT INTO public.org_memberships (user_id, org_id)
  SELECT v_user_id, o.id
  FROM public.organizations o
  WHERE o.active = true
    AND o.allowed_domains IS NOT NULL
    AND v_domain = ANY (o.allowed_domains)
  ON CONFLICT DO NOTHING;
END;
$function$;

-- Backfill: every currently-active internal-domain user that the old RPC
-- created without the corresponding membership.
INSERT INTO public.org_memberships (user_id, org_id)
SELECT u.id, o.id
FROM public.users u
JOIN public.organizations o
  ON o.active = true
 AND o.allowed_domains IS NOT NULL
 AND split_part(u.email, '@', 2) = ANY (o.allowed_domains)
WHERE u.active = true
ON CONFLICT DO NOTHING;
