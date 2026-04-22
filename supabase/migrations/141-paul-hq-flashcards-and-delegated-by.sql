-- Migration 141: Paul HQ scaffolding
-- Adds greg_actions.delegated_by + paul_hq_flashcards table with seed content.
-- Already applied via Supabase MCP on 2026-04-22. File kept for repo-local traceability.

ALTER TABLE public.greg_actions
  ADD COLUMN IF NOT EXISTS delegated_by text;

COMMENT ON COLUMN public.greg_actions.delegated_by IS
  'Email or shorthand of the person who delegated this action. Used by Paul HQ to surface actions Paul has asked someone else to do.';

CREATE INDEX IF NOT EXISTS idx_greg_actions_delegated_by
  ON public.greg_actions (delegated_by)
  WHERE delegated_by IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.paul_hq_flashcards (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  term text NOT NULL,
  definition_md text NOT NULL,
  persona text[] NOT NULL DEFAULT ARRAY['all'],
  display_order int NOT NULL DEFAULT 0,
  learn_slug text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.paul_hq_flashcards ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.paul_hq_flashcards IS
  'Rotating flashcards shown in Paul HQ. No policies = deny-all to anon/authenticated; Paul HQ reads via service-role only.';
