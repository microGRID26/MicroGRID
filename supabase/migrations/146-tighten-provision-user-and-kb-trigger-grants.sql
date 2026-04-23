-- Migration 146: tighten grants on provision_user + the atlas_kb trigger.
--
-- Retroactive dry-run of the atlas-fn-grant-guard (2026-04-23) against the
-- existing MG migration history surfaced these two functions as having
-- PUBLIC/anon EXECUTE grants they don't need.
--
--   provision_user — has a real auth.email() JWT gate inside the body (an
--     anon caller with no JWT hits auth.email()=NULL and raises
--     insufficient_privilege). So no live vulnerability. But PUBLIC on the
--     grant list is unnecessary surface; authenticated + service_role
--     alone suffice. This aligns with the CLAUDE.md "apply the same fix
--     globally" rule — the same REVOKE PUBLIC treatment we applied to the
--     atlas_* family in migrations 144+144b should cover every SECURITY
--     DEFINER RPC, not just the atlas_ namespace.
--
--   atlas_kb_entries_touch_updated_at — trigger function, not directly
--     PostgREST-invocable, so the anon grant is cosmetic. Revoke for
--     consistency so a future audit doesn't re-flag it.
--
-- Reversible: GRANT EXECUTE ... TO PUBLIC (or anon) on each reverts.

begin;

revoke execute on function public.provision_user(p_email text, p_name text) from public;
revoke execute on function public.provision_user(p_email text, p_name text) from anon;

revoke execute on function public.atlas_kb_entries_touch_updated_at() from public;
revoke execute on function public.atlas_kb_entries_touch_updated_at() from anon;

commit;
