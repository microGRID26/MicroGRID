-- Migration 141c: defense-in-depth grant revocation.
-- RLS was enabled with no policies in 141, which denies today — but the base
-- grants to anon/authenticated were still intact. If any future policy adds
-- `USING (true)` by accident, those grants would open the tables.
-- service_role bypasses grants, so Paul HQ's server-side reads keep working.

REVOKE ALL ON public.paul_hq_flashcards FROM anon, authenticated;
REVOKE ALL ON public.greg_actions FROM anon, authenticated;
