-- ============================================================
-- Ask Atlas inbox: when Greg answers an escalated greg_action,
-- pipe the answer back to the employee who asked.
-- ============================================================

alter table public.atlas_questions
  add column if not exists escalation_seen_at timestamptz;

create index if not exists idx_atlas_q_inbox
  on public.atlas_questions(user_email)
  where escalated = true and escalation_seen_at is null;

-- ---------- atlas_inbox_answers RPC ----------
-- Returns recent answered escalations for the caller (by email) that they
-- haven't marked seen yet. Joins atlas_questions → greg_actions.answer.

create or replace function public.atlas_inbox_answers(p_limit int default 20)
returns table (
  question_id     bigint,
  question        text,
  asked_at        timestamptz,
  action_id       bigint,
  answer          text,
  answered_at     timestamptz
)
language sql stable security definer
set search_path = public, pg_catalog as $$
  -- SECURITY DEFINER because greg_actions has RLS enabled with no policies
  -- (service-role-only writes); caller-scoping is enforced by the
  -- user_email = auth.jwt() ->> 'email' predicate below.
  select
    q.id              as question_id,
    q.question        as question,
    q.created_at      as asked_at,
    ga.id             as action_id,
    ga.answer         as answer,
    ga.answered_at    as answered_at
  from public.atlas_questions q
  join public.greg_actions   ga on ga.id = q.escalated_action_id
  where q.user_email = auth.jwt() ->> 'email'
    and q.escalated = true
    and q.escalation_seen_at is null
    and ga.answer is not null
  order by ga.answered_at desc nulls last, q.id desc
  limit greatest(1, least(p_limit, 100));
$$;

revoke execute on function public.atlas_inbox_answers(int) from public;
grant  execute on function public.atlas_inbox_answers(int) to authenticated;

-- ---------- atlas_mark_inbox_seen RPC ----------

create or replace function public.atlas_mark_inbox_seen(p_question_id bigint)
returns void
language plpgsql security invoker
set search_path = public, pg_catalog as $$
begin
  update public.atlas_questions
     set escalation_seen_at = now()
   where id = p_question_id
     and user_email = auth.jwt() ->> 'email';
  if not found then
    raise exception 'question not found or not owned by caller';
  end if;
end;
$$;

revoke execute on function public.atlas_mark_inbox_seen(bigint) from public;
grant  execute on function public.atlas_mark_inbox_seen(bigint) to authenticated;
