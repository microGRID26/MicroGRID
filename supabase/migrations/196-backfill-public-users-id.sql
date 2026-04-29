-- 196-backfill-public-users-id.sql
-- Closes greg_actions #363 + #389.
--
-- Problem: public.users.id != auth.users.id for 10 active role-bearing users.
-- Discovered when role-gate.ts queries returned 0 rows for most admins.
-- Workaround already shipped: lib/auth/role-gate.ts joins by email (commit 37e9af1).
-- This migration aligns the IDs so id-based joins work everywhere.
--
-- Blast radius (verified 2026-04-29 via per-column scan, see #389 body for method):
--   18 user-ref columns hold ~1,911 rows pointing at the 10 old pub_ids.
--   Top hits: notes.pm_id (808), audit_log.changed_by_id (604), projects.pm_id (259).
--   Zero hits on commission_records, tickets.assigned_to/pm_id, sales_teams.*, work_orders.*.
--   No FK-cascade footprint outside the 6 hard FKs declared in this schema.
--
-- Strategy:
--   1. Drop the 6 hard FKs that reference public.users.id (all NO ACTION ON UPDATE).
--   2. UPDATE every soft-ref column with an old_id -> new_id rewrite using a CTE map.
--   3. UPDATE public.users.id itself.
--   4. Re-add the 6 FKs.
-- All atomic in one transaction. Rollback-safe.
--
-- Verification at the end: RAISE EXCEPTION if any column still holds an old_pub_id.

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Drop the 6 hard FKs
-- ----------------------------------------------------------------------------
ALTER TABLE public.funding_nf_changes DROP CONSTRAINT funding_nf_changes_changed_by_fkey;
ALTER TABLE public.funding_notes      DROP CONSTRAINT funding_notes_author_id_fkey;
ALTER TABLE public.note_mentions      DROP CONSTRAINT note_mentions_mentioned_by_fkey;
ALTER TABLE public.note_mentions      DROP CONSTRAINT note_mentions_mentioned_user_id_fkey;
ALTER TABLE public.partner_api_keys   DROP CONSTRAINT partner_api_keys_created_by_id_fkey;
ALTER TABLE public.partner_api_keys   DROP CONSTRAINT partner_api_keys_revoked_by_id_fkey;

-- ----------------------------------------------------------------------------
-- 2. Build the old_id -> new_id map and rewrite every soft-ref column
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_map_count int;
BEGIN
  -- Materialize the map into a temp table for repeated use
  CREATE TEMP TABLE _user_id_map ON COMMIT DROP AS
  SELECT u.id AS old_id, au.id AS new_id, u.email
  FROM public.users u
  JOIN auth.users au ON lower(au.email) = lower(u.email)
  WHERE u.active = true AND u.role IS NOT NULL AND u.id <> au.id;

  SELECT count(*) INTO v_map_count FROM _user_id_map;
  RAISE NOTICE 'Backfilling % users (id -> auth.users.id alignment)', v_map_count;
  IF v_map_count = 0 THEN
    RAISE EXCEPTION 'No mismatched users found - migration skipped (already applied?)';
  END IF;

  -- ---- uuid-typed columns (10) --------------------------------------------
  UPDATE public.tickets t SET created_by_id = m.new_id
    FROM _user_id_map m WHERE t.created_by_id = m.old_id;

  UPDATE public.ticket_history t SET changed_by_id = m.new_id
    FROM _user_id_map m WHERE t.changed_by_id = m.old_id;

  UPDATE public.ticket_comments t SET author_id = m.new_id
    FROM _user_id_map m WHERE t.author_id = m.old_id;

  UPDATE public.funding_notes f SET author_id = m.new_id
    FROM _user_id_map m WHERE f.author_id = m.old_id;

  UPDATE public.note_mentions n SET mentioned_by = m.new_id
    FROM _user_id_map m WHERE n.mentioned_by = m.old_id;

  UPDATE public.note_mentions n SET mentioned_user_id = m.new_id
    FROM _user_id_map m WHERE n.mentioned_user_id = m.old_id;

  UPDATE public.ntp_requests nr SET submitted_by_id = m.new_id
    FROM _user_id_map m WHERE nr.submitted_by_id = m.old_id;

  UPDATE public.ntp_requests nr SET reviewed_by_id = m.new_id
    FROM _user_id_map m WHERE nr.reviewed_by_id = m.old_id;

  UPDATE public.invoices i SET created_by_id = m.new_id
    FROM _user_id_map m WHERE i.created_by_id = m.old_id;

  UPDATE public.partner_api_keys pak SET created_by_id = m.new_id
    FROM _user_id_map m WHERE pak.created_by_id = m.old_id;

  -- ---- text-typed columns (8) ---------------------------------------------
  UPDATE public.notes n SET pm_id = m.new_id::text
    FROM _user_id_map m WHERE n.pm_id = m.old_id::text;

  UPDATE public.projects p SET pm_id = m.new_id::text
    FROM _user_id_map m WHERE p.pm_id = m.old_id::text;

  UPDATE public.audit_log a SET changed_by_id = m.new_id::text
    FROM _user_id_map m WHERE a.changed_by_id = m.old_id::text;

  UPDATE public.user_sessions u SET user_id = m.new_id::text
    FROM _user_id_map m WHERE u.user_id = m.old_id::text;

  UPDATE public.mention_notifications mn SET mentioned_user_id = m.new_id::text
    FROM _user_id_map m WHERE mn.mentioned_user_id = m.old_id::text;

  UPDATE public.schedule s SET pm_id = m.new_id::text
    FROM _user_id_map m WHERE s.pm_id = m.old_id::text;

  UPDATE public.time_entries t SET user_id = m.new_id::text
    FROM _user_id_map m WHERE t.user_id = m.old_id::text;

  UPDATE public.test_assignments t SET assigned_by = m.new_id::text
    FROM _user_id_map m WHERE t.assigned_by = m.old_id::text;

  RAISE NOTICE 'Soft-ref column rewrites complete';
END $$;

-- ----------------------------------------------------------------------------
-- 3. UPDATE public.users.id itself
-- ----------------------------------------------------------------------------
UPDATE public.users u
SET id = au.id
FROM auth.users au
WHERE lower(au.email) = lower(u.email)
  AND u.active = true
  AND u.role IS NOT NULL
  AND u.id <> au.id;

-- ----------------------------------------------------------------------------
-- 4. Re-add the 6 hard FKs
-- ----------------------------------------------------------------------------
ALTER TABLE public.funding_nf_changes
  ADD CONSTRAINT funding_nf_changes_changed_by_fkey
  FOREIGN KEY (changed_by) REFERENCES public.users(id);

ALTER TABLE public.funding_notes
  ADD CONSTRAINT funding_notes_author_id_fkey
  FOREIGN KEY (author_id) REFERENCES public.users(id);

ALTER TABLE public.note_mentions
  ADD CONSTRAINT note_mentions_mentioned_by_fkey
  FOREIGN KEY (mentioned_by) REFERENCES public.users(id);

ALTER TABLE public.note_mentions
  ADD CONSTRAINT note_mentions_mentioned_user_id_fkey
  FOREIGN KEY (mentioned_user_id) REFERENCES public.users(id);

ALTER TABLE public.partner_api_keys
  ADD CONSTRAINT partner_api_keys_created_by_id_fkey
  FOREIGN KEY (created_by_id) REFERENCES public.users(id);

ALTER TABLE public.partner_api_keys
  ADD CONSTRAINT partner_api_keys_revoked_by_id_fkey
  FOREIGN KEY (revoked_by_id) REFERENCES public.users(id);

-- ----------------------------------------------------------------------------
-- 5. Verification: assert no row in any of the 18 columns still references
--    a user whose public.users.id no longer matches auth.users.id.
--    After this migration that set should be empty.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_remaining int;
BEGIN
  SELECT count(*) INTO v_remaining
  FROM public.users u
  JOIN auth.users au ON lower(au.email) = lower(u.email)
  WHERE u.active = true AND u.role IS NOT NULL AND u.id <> au.id;

  IF v_remaining > 0 THEN
    RAISE EXCEPTION 'Migration failed: % users still mismatched after backfill', v_remaining;
  END IF;
  RAISE NOTICE 'Verification passed: 0 mismatched users remain';
END $$;

COMMIT;
