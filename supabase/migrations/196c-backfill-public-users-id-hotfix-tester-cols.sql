-- 196c-backfill-public-users-id-hotfix-tester-cols.sql
-- Second hotfix to mig 196. R2 verification scan (every uuid + text column in public.*
-- against migration_196_user_id_map.old_id) caught 3 missed columns: tester_id on
-- test_assignments / qa_runs / test_results. 205 rows total.
--
-- Original column-pattern scan in mig 196 keyed on `*_by`, `*_by_id`, `assigned_to`,
-- `*author*`, `pm_id`, `manager*`, `submitted*`, `reviewed*`, etc. — `tester*` wasn't
-- on the list because no production user-ref column uses that prefix outside of QA.
--
-- audit_log.new_value (158) and audit_log.old_value (10) ALSO contain old IDs but are
-- intentional historical snapshots. Rewriting them would corrupt the audit trail.
-- Leaving those alone is correct.

UPDATE public.test_assignments t
SET tester_id = m.new_id::text
FROM public.migration_196_user_id_map m
WHERE t.tester_id = m.old_id::text;

UPDATE public.qa_runs q
SET tester_id = m.new_id::text
FROM public.migration_196_user_id_map m
WHERE q.tester_id = m.old_id::text;

UPDATE public.test_results r
SET tester_id = m.new_id::text
FROM public.migration_196_user_id_map m
WHERE r.tester_id = m.old_id::text;

-- Verification: 0 rows on these 3 columns should still hold an old ID.
DO $$
DECLARE v_remaining int;
BEGIN
  SELECT
    (SELECT count(*) FROM public.test_assignments WHERE tester_id IN (SELECT old_id::text FROM public.migration_196_user_id_map))
  + (SELECT count(*) FROM public.qa_runs          WHERE tester_id IN (SELECT old_id::text FROM public.migration_196_user_id_map))
  + (SELECT count(*) FROM public.test_results     WHERE tester_id IN (SELECT old_id::text FROM public.migration_196_user_id_map))
  INTO v_remaining;

  IF v_remaining > 0 THEN
    RAISE EXCEPTION 'Hotfix 196c failed: % rows still hold old pub_ids on tester_id columns', v_remaining;
  END IF;
  RAISE NOTICE 'Hotfix 196c passed: 0 tester_id orphans remain';
END $$;
