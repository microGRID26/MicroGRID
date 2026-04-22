-- 138-harness-drilldowns-grants-and-no-metadata.sql
-- Follow-up to 137 after red-teamer review. Two changes:
--   1. Explicit `grant execute … to service_role` on all three RPCs. Supabase
--      grants service_role implicitly today, but the REVOKE FROM PUBLIC line
--      in 137 is the load-bearing thing — make the keep-grant explicit so the
--      migration is portable to other Supabase projects / config changes.
--   2. Drop the `metadata jsonb` column from atlas_rule_violation_events return
--      shape. The /harness drilldown UI never rendered it; returning the full
--      hook metadata risked shipping anything a future hook decided to stuff
--      in there (command output, env dumps, file contents) to the browser as
--      raw JSON via network tab.

grant execute on function public.atlas_hook_event_timeseries(integer, integer) to service_role;
grant execute on function public.atlas_claude_md_changelog(integer) to service_role;

-- atlas_rule_violation_events: requires DROP first because Postgres won't
-- let CREATE OR REPLACE change a function's return shape.
drop function if exists public.atlas_rule_violation_events(text, integer, integer);

create function public.atlas_rule_violation_events(
  p_rule_id     text,
  p_since_hours integer default 168,
  p_limit       integer default 20
)
returns table (
  event_at     timestamptz,
  host         text,
  hook_name    text,
  hook_event   text,
  duration_ms  integer
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
    duration_ms
  from public.atlas_hook_events
  where decision = 'block'
    and block_reason = p_rule_id
    and event_at >= now() - (coalesce(p_since_hours, 168) || ' hours')::interval
  order by event_at desc
  limit coalesce(p_limit, 20);
$$;

revoke execute on function public.atlas_rule_violation_events(text, integer, integer) from public, anon, authenticated;
grant execute on function public.atlas_rule_violation_events(text, integer, integer) to service_role;
