-- 139-eval-runs-weighted-version-variant.sql
-- Adds three columns to atlas_eval_runs to support Phase 2 of the harness rebuild:
--   weighted_overall_pct  → severity-weighted score (critical=4, high=3, medium=2, low=1, info=0)
--                           Honest single number when one critical fail outweighs ten low pass.
--   grader_prompt_version → frozen version string of the grader prompt at run time, so historical
--                           scores stay comparable across grader-prompt edits.
--   variant               → 'baseline' (default) or 'ab-test:<label>' for A/B CLAUDE.md runs.
--                           Lets the UI separate baseline runs from variant runs in the timeline.
-- Then re-creates atlas_record_eval_run with the three new optional params.

alter table public.atlas_eval_runs
  add column if not exists weighted_overall_pct numeric,
  add column if not exists grader_prompt_version text,
  add column if not exists variant text;

-- Backfill: existing rows are baseline by definition.
update public.atlas_eval_runs
set variant = 'baseline'
where variant is null;

create or replace function public.atlas_record_eval_run(
  p_total_entries integer,
  p_overall_pct numeric,
  p_per_rule_json jsonb,
  p_per_entry_json jsonb,
  p_claude_md_sha text default null,
  p_grader_model text default null,
  p_subject_model text default null,
  p_duration_ms integer default null,
  p_cost_usd numeric default null,
  p_notes text default null,
  p_weighted_overall_pct numeric default null,
  p_grader_prompt_version text default null,
  p_variant text default 'baseline'
)
returns bigint
language sql
security definer
set search_path = public
as $$
  insert into atlas_eval_runs (
    total_entries, overall_pct, per_rule_json, per_entry_json,
    claude_md_sha, grader_model, subject_model,
    duration_ms, cost_usd, notes,
    weighted_overall_pct, grader_prompt_version, variant
  ) values (
    p_total_entries, p_overall_pct, p_per_rule_json, p_per_entry_json,
    p_claude_md_sha, p_grader_model, p_subject_model,
    p_duration_ms, p_cost_usd, p_notes,
    p_weighted_overall_pct, p_grader_prompt_version, coalesce(p_variant, 'baseline')
  )
  returning id;
$$;

revoke execute on function public.atlas_record_eval_run(integer, numeric, jsonb, jsonb, text, text, text, integer, numeric, text, numeric, text, text) from public, anon, authenticated;
grant execute on function public.atlas_record_eval_run(integer, numeric, jsonb, jsonb, text, text, text, integer, numeric, text, numeric, text, text) to service_role;
