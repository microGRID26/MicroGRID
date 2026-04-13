-- 098-invoice-automation.sql — Tier 1 invoice automation (milestone-driven generation + view tracking)
--
-- Adds the columns and index needed to:
--   1. Auto-generate invoices from invoice_rules on project milestones (NTP, install complete, PTO)
--      without creating duplicates if the milestone fires more than once.
--   2. Track when a sent invoice is first viewed by the recipient (pixel-beacon pattern).
--   3. Send invoices via email (organizations need a billing_email column).
--
-- Run via Supabase SQL editor or `supabase db push`.

-- ── invoices: view tracking + generation provenance + idempotency ───────────

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS generated_by TEXT DEFAULT 'manual'
    CHECK (generated_by IN ('manual', 'rule', 'import')),
  ADD COLUMN IF NOT EXISTS rule_id UUID REFERENCES public.invoice_rules(id) ON DELETE SET NULL;

-- Idempotency: one rule-generated invoice per (project, rule, milestone) tuple.
-- Partial index skips manual invoices (rule_id IS NULL) and invoices without a project.
-- This is the load-bearing piece that makes fireMilestoneInvoices() safe to call
-- more than once for the same milestone event (page reloads, retries, webhook replays).
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_rule_idempotency
  ON public.invoices (project_id, rule_id, milestone)
  WHERE rule_id IS NOT NULL AND project_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_viewed_at
  ON public.invoices (viewed_at)
  WHERE viewed_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_generated_by
  ON public.invoices (generated_by);

-- ── organizations: billing_email for invoice send route ─────────────────────

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS billing_email TEXT,
  ADD COLUMN IF NOT EXISTS billing_address TEXT;

COMMENT ON COLUMN public.organizations.billing_email IS
  'Email address invoices are sent to when this org is the recipient (to_org). If null, the send route refuses with a clear error.';

COMMENT ON COLUMN public.organizations.billing_address IS
  'Optional free-text billing address displayed on the invoice PDF bill-to block.';
