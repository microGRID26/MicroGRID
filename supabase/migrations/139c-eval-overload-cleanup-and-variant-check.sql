-- 139c-eval-overload-cleanup-and-variant-check.sql
-- Three follow-up hardenings caught by red-teamer review of Phase 2.

-- 1) Drop the 10-arg overload of atlas_record_eval_run that survived 139.
--    `create or replace` with a different signature creates a NEW overload
--    rather than replacing — the old one kept whatever grants it had, so any
--    authenticated caller could insert eval rows bypassing the new variant /
--    version columns. Postgres routes by argument count + types, so the
--    typescript persist.ts (which now sends 13 named params) hits the new
--    overload, but a hand-crafted REST call with 10 params would still hit
--    the old one. Drop it explicitly.
drop function if exists public.atlas_record_eval_run(
  integer, numeric, jsonb, jsonb, text, text, text, integer, numeric, text
);

-- 2) CHECK constraint on the variant column. Today only the cron paths set this
--    (after LABEL_RE validation in the API route), but a constraint at the DB
--    layer prevents any future caller from inserting an arbitrary variant string.
alter table public.atlas_eval_runs
  drop constraint if exists atlas_eval_runs_variant_check;
alter table public.atlas_eval_runs
  add constraint atlas_eval_runs_variant_check
  check (variant is null or variant ~ '^(baseline|ab-test:[a-zA-Z0-9_-]{1,40})$');

-- 3) atlas_previous_eval_run: the create-or-replace in 139b inherited whatever
--    grants the prior version had. Lock to service_role only, matching 139's
--    pattern.
revoke execute on function public.atlas_previous_eval_run() from public, anon, authenticated;
grant execute on function public.atlas_previous_eval_run() to service_role;
