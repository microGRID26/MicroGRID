-- 110-projects-partner-origination.sql — Track which partner + rep created a lead.
--
-- Background: Phase 3 of the Partner API platform ships Solicit (D2D sales app)
-- as the first partner that creates `projects` rows via API. We need to know:
--   1. Which partner org (Solicit) originated the lead
--   2. Which specific rep (partner_actors row) closed it
-- ...so we can surface attribution in dashboards, roll up commissions per rep,
-- and scope partner API reads back to "only leads this partner made."
--
-- `partner_documents` is the JSONB catch-all for partner-uploaded files
-- (signed contracts, utility bills, etc). Same shape as
-- `engineering_assignments.deliverables`. Phase 4 may promote this to a
-- real table once we know the access-pattern shape.
--
-- Idempotent: safe to re-run.

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS origination_partner_org_id   UUID REFERENCES public.organizations(id),
  ADD COLUMN IF NOT EXISTS origination_partner_actor_id UUID REFERENCES public.partner_actors(id),
  ADD COLUMN IF NOT EXISTS partner_documents            JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.projects.origination_partner_org_id IS
  'Partner API org that created this lead via POST /api/v1/partner/leads (Phase 3). NULL for leads created via the web UI or pre-API SubHub imports.';

COMMENT ON COLUMN public.projects.origination_partner_actor_id IS
  'Specific rep (partner_actors row) identified via X-MG-Actor header at lead creation. NULL when actor header was absent.';

COMMENT ON COLUMN public.projects.partner_documents IS
  'Array of {name, url, type, uploaded_by_actor, uploaded_at} objects uploaded by partners via POST /api/v1/partner/leads/:id/documents. Not the same as project_documents (which ties to the document_requirements workflow).';

-- Partial index: only non-null partner-originated rows. Keeps the index small
-- on a table that will stay mostly web/SubHub-originated.
CREATE INDEX IF NOT EXISTS idx_projects_origination_partner
  ON public.projects(origination_partner_org_id)
  WHERE origination_partner_org_id IS NOT NULL;
