-- 139b-eval-baseline-only-previous.sql
-- After 139 added the `variant` column to atlas_eval_runs, atlas_previous_eval_run
-- (called by the cron to compute regression deltas) would treat the most recent
-- A/B variant row as "previous baseline." That pollutes the regression signal —
-- an A/B test of a candidate CLAUDE.md should not become the comparison anchor
-- for the next nightly baseline run. Filter to baseline only.

create or replace function public.atlas_previous_eval_run()
returns atlas_eval_runs
language sql
security definer
set search_path = public
as $$
  select * from atlas_eval_runs
  where variant is null or variant = 'baseline'
  order by ran_at desc
  offset 1 limit 1;
$$;
