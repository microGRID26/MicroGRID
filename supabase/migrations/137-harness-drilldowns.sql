-- 137-harness-drilldowns.sql
-- Three read-only RPCs powering new /harness drilldowns on ATLAS HQ:
--   1. atlas_rule_violation_events  → click a rule on the Violations card, see the last N block events
--   2. atlas_hook_event_timeseries  → sparkline per hook on the Hooks card
--   3. atlas_claude_md_changelog    → "when did CLAUDE.md last change?" on the Atlas core card
-- All SECURITY DEFINER STABLE, called from HQ server routes using sb_secret_*.
-- Zero writes. No PII surfaces (atlas_hook_events has decisions + rule_ids only).

-- ---------- atlas_rule_violation_events ----------
create or replace function public.atlas_rule_violation_events(
  p_rule_id     text,
  p_since_hours integer default 168,
  p_limit       integer default 20
)
returns table (
  event_at     timestamptz,
  host         text,
  hook_name    text,
  hook_event   text,
  duration_ms  integer,
  metadata     jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select
    event_at,
    host,
    hook_name,
    hook_event,
    duration_ms,
    metadata
  from public.atlas_hook_events
  where decision = 'block'
    and block_reason = p_rule_id
    and event_at >= now() - (coalesce(p_since_hours, 168) || ' hours')::interval
  order by event_at desc
  limit coalesce(p_limit, 20);
$$;

revoke execute on function public.atlas_rule_violation_events(text, integer, integer) from public, anon, authenticated;

-- ---------- atlas_hook_event_timeseries ----------
-- Returns one row per (hook_name, bucket_start). Bucket size is p_bucket_hours.
-- Default: 7d window, 6h buckets → 28 buckets per hook.
create or replace function public.atlas_hook_event_timeseries(
  p_since_hours integer default 168,
  p_bucket_hours integer default 6
)
returns table (
  hook_name    text,
  bucket_start timestamptz,
  total        bigint,
  blocks       bigint,
  errors       bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with params as (
    select
      coalesce(p_since_hours, 168) as since_hours,
      greatest(coalesce(p_bucket_hours, 6), 1) as bucket_hours
  ),
  bucketed as (
    select
      hook_name,
      date_trunc('hour', event_at)
        - ((extract(hour from event_at)::int % (select bucket_hours from params)) || ' hours')::interval
        as bucket_start,
      decision
    from public.atlas_hook_events, params
    where event_at >= now() - (params.since_hours || ' hours')::interval
  )
  select
    hook_name,
    bucket_start,
    count(*)::bigint                                 as total,
    count(*) filter (where decision = 'block')::bigint as blocks,
    count(*) filter (where decision = 'error')::bigint as errors
  from bucketed
  group by hook_name, bucket_start
  order by hook_name, bucket_start;
$$;

revoke execute on function public.atlas_hook_event_timeseries(integer, integer) from public, anon, authenticated;

-- ---------- atlas_claude_md_changelog ----------
-- Pulls distinct claude_md_sha values from atlas_harness_snapshots with the
-- first/last timestamp each sha was seen. Lets /harness render "CLAUDE.md last
-- changed <ago>" + a short history without needing to track git commits directly.
create or replace function public.atlas_claude_md_changelog(
  p_limit integer default 10
)
returns table (
  claude_md_sha text,
  first_seen_at timestamptz,
  last_seen_at  timestamptz,
  snapshot_count bigint,
  claude_md_lines integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    claude_md_sha,
    min(captured_at) as first_seen_at,
    max(captured_at) as last_seen_at,
    count(*)::bigint as snapshot_count,
    -- take whichever line count co-occurred with the latest appearance of this sha
    (array_agg((payload->'memory'->>'claude_md_lines')::int order by captured_at desc))[1]
      as claude_md_lines
  from public.atlas_harness_snapshots
  where claude_md_sha is not null
  group by claude_md_sha
  order by min(captured_at) desc
  limit coalesce(p_limit, 10);
$$;

revoke execute on function public.atlas_claude_md_changelog(integer) from public, anon, authenticated;
