-- 109-partner-api-foundation.sql — Partner API platform (v1)
--
-- Enables external vendors (Rush Engineering, Solicit D2D, NewCo Supply, future
-- partners) to authenticate and interact with MicroGRID over HTTP instead of
-- logging into the web UI as humans. Built as a generic platform — Rush is the
-- first tenant, not the only one. Plan: ~/.claude/plans/zazzy-splashing-zebra.md.
--
-- Seven tables:
--   1. partner_api_keys           — credentials (bearer + signing secret, both hashed)
--   2. partner_actors             — rep-level sub-identities (Solicit use case)
--   3. partner_webhook_subscriptions — outbound webhook config per partner
--   4. partner_event_outbox       — transactional outbox (cron drains this)
--   5. partner_webhook_deliveries — fanout queue (monthly-partitioned)
--   6. partner_idempotency_keys   — 24h idempotency cache for POSTs
--   7. partner_api_logs           — request log (monthly-partitioned, 90d retention)
--
-- All tables platform-internal via RLS (`auth_is_platform_user()` from mig 042).
-- Partners never query Supabase directly — always through the Next.js API layer,
-- which holds a service-role client and enforces scope in app code.
--
-- Also extends organizations.org_type CHECK with 'sales_d2d' for Solicit.
--
-- Idempotent: safe to re-run.

-- ── 0. Prereq: pgcrypto for webhook-secret encryption ───────────────────────

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── 1. Extend org_type CHECK for sales_d2d ──────────────────────────────────

ALTER TABLE public.organizations DROP CONSTRAINT IF EXISTS organizations_org_type_check;

ALTER TABLE public.organizations ADD CONSTRAINT organizations_org_type_check
  CHECK (org_type IN (
    'platform',
    'epc',
    'sales',
    'sales_d2d',                    -- NEW: Solicit and other D2D sales orgs (2026-04-16)
    'engineering',
    'supply',
    'customer',
    'direct_supply_equity_corp',
    'newco_distribution'
  ));

-- ── 2. partner_api_keys ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.partner_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                          -- human-readable, e.g. "Rush Production"
  key_prefix TEXT NOT NULL,                    -- first 12 chars (e.g. "mg_live_abc1") for admin display
  key_hash TEXT NOT NULL UNIQUE,               -- SHA-256 hex of the full bearer
  -- Optional per-key signing secret for partners who opt into signed-write
  -- mode (set by admin tool, not by default). pgcrypto-encrypted; NULL ⇒
  -- bearer-only auth (the Stripe/GitHub default). Can be added later without
  -- a schema change.
  signing_secret_encrypted BYTEA,
  scopes TEXT[] NOT NULL DEFAULT '{}',         -- e.g. {'engineering:assignments:read','engineering:assignments:write'}
  rate_limit_tier TEXT NOT NULL DEFAULT 'standard'
    CHECK (rate_limit_tier IN ('standard','premium','unlimited')),
  customer_pii_scope BOOLEAN NOT NULL DEFAULT false,  -- unlocks phone/email in customer responses
  dpa_version TEXT,                            -- which data-processing agreement version they signed
  created_by_id UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  last_used_ip INET,
  last_used_user_agent TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '1 year'),
  revoked_at TIMESTAMPTZ,
  revoked_by_id UUID REFERENCES public.users(id),
  revoke_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_pak_org ON public.partner_api_keys(org_id);
CREATE INDEX IF NOT EXISTS idx_pak_active ON public.partner_api_keys(org_id) WHERE revoked_at IS NULL;

COMMENT ON TABLE public.partner_api_keys IS
  'Partner API credentials. Each row = one issued key, scoped to an org. Both key and signing secret are stored as SHA-256 hashes only — plaintext returned exactly once at creation.';

-- ── 3. partner_actors ───────────────────────────────────────────────────────
-- For org-level keys (e.g. Solicit) that need to attribute requests to
-- individual reps without managing per-rep credentials.

CREATE TABLE IF NOT EXISTS public.partner_actors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,                   -- "rep_abc123" from Solicit's system
  display_name TEXT,
  email TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, external_id)
);

CREATE INDEX IF NOT EXISTS idx_pactors_org ON public.partner_actors(org_id) WHERE active;

COMMENT ON TABLE public.partner_actors IS
  'Sub-identities beneath an org-level API key. Passed via X-MG-Actor: <external_id> header on write requests. Avoids managing per-rep credentials.';

-- ── 4. partner_webhook_subscriptions ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.partner_webhook_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  api_key_id UUID REFERENCES public.partner_api_keys(id) ON DELETE SET NULL,
  url TEXT NOT NULL,
  secret_encrypted BYTEA NOT NULL,             -- pgcrypto symmetric-encrypted, decrypted at dispatch time
  events TEXT[] NOT NULL,                      -- e.g. {'engineering.assignment.created'}
  active BOOLEAN NOT NULL DEFAULT true,
  last_success_at TIMESTAMPTZ,
  last_failure_at TIMESTAMPTZ,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- R1 fix (Medium): reject obviously-bad URLs at the schema level.
  -- SSRF protection happens in app code (lib/partner-api/events/ssrf.ts
  -- — Phase 4) but the schema enforces the absolute baseline.
  CONSTRAINT partner_webhook_subs_url_format CHECK (url ~* '^https?://')
);

CREATE INDEX IF NOT EXISTS idx_pws_org ON public.partner_webhook_subscriptions(org_id);
CREATE INDEX IF NOT EXISTS idx_pws_active ON public.partner_webhook_subscriptions(active) WHERE active;
-- GIN index on events[] for the fanout step — "find all subscriptions listening to event X"
CREATE INDEX IF NOT EXISTS idx_pws_events ON public.partner_webhook_subscriptions USING GIN (events) WHERE active;

COMMENT ON TABLE public.partner_webhook_subscriptions IS
  'Outbound webhook subscriptions per partner. Secret is pgcrypto-encrypted with PARTNER_WEBHOOK_KMS_KEY (env var). Decrypted only at dispatch time inside the cron.';

-- Helper function to set updated_at on any UPDATE
CREATE OR REPLACE FUNCTION public.partner_webhook_subs_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pws_updated_at_trigger ON public.partner_webhook_subscriptions;
CREATE TRIGGER pws_updated_at_trigger
  BEFORE UPDATE ON public.partner_webhook_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.partner_webhook_subs_updated_at();

-- ── 5. partner_event_outbox ─────────────────────────────────────────────────
-- Transactional outbox: mutation sites insert a row here in the same Postgres
-- transaction as the underlying write. A cron drains rows → fans out to
-- partner_webhook_deliveries. Guarantees "committed ⟹ delivered."

CREATE TABLE IF NOT EXISTS public.partner_event_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,                    -- e.g. "engineering.assignment.created"
  event_id UUID NOT NULL DEFAULT gen_random_uuid(), -- stable across retries; delivered once per (sub, event_id)
  payload JSONB NOT NULL,
  emitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  fanned_out_at TIMESTAMPTZ                    -- null until fanout cron processes it
);

CREATE INDEX IF NOT EXISTS idx_peo_pending ON public.partner_event_outbox(emitted_at)
  WHERE fanned_out_at IS NULL;

COMMENT ON TABLE public.partner_event_outbox IS
  'Transactional outbox for partner events. emitPartnerEvent() inserts here in the same tx as the mutation; fanout cron drains to partner_webhook_deliveries.';

-- ── 6. partner_webhook_deliveries (monthly-partitioned) ─────────────────────

CREATE TABLE IF NOT EXISTS public.partner_webhook_deliveries (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.partner_webhook_subscriptions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_id UUID NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','delivered','failed','dead')),
  attempt_count INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_status_code INTEGER,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  PRIMARY KEY (id, created_at),
  UNIQUE (subscription_id, event_id, created_at)  -- PK/UNIQUE include partition key
) PARTITION BY RANGE (created_at);

-- Initial partitions: current + next two months (enough to run for ~90 days
-- without cron maintenance; retention cron will add new ones monthly).
DO $$
DECLARE
  m INT;
  part_start DATE;
  part_end DATE;
  part_name TEXT;
BEGIN
  FOR m IN 0..2 LOOP
    part_start := date_trunc('month', now() + (m || ' month')::interval)::date;
    part_end := (part_start + interval '1 month')::date;
    part_name := 'partner_webhook_deliveries_' || to_char(part_start, 'YYYYMM');
    EXECUTE format(
      'CREATE TABLE IF NOT EXISTS public.%I PARTITION OF public.partner_webhook_deliveries FOR VALUES FROM (%L) TO (%L)',
      part_name, part_start, part_end
    );
  END LOOP;
END $$;

-- Partial index on work the dispatcher needs to scan
CREATE INDEX IF NOT EXISTS idx_pwd_pending ON public.partner_webhook_deliveries (next_attempt_at)
  WHERE status IN ('pending','failed');
CREATE INDEX IF NOT EXISTS idx_pwd_sub ON public.partner_webhook_deliveries (subscription_id, created_at DESC);

COMMENT ON TABLE public.partner_webhook_deliveries IS
  'Per-subscription delivery queue. Monthly range-partitioned on created_at. Dispatcher cron scans the partial index on (pending/failed, next_attempt_at) for cheap fanout scans.';

-- ── 7. partner_idempotency_keys ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.partner_idempotency_keys (
  api_key_id UUID NOT NULL REFERENCES public.partner_api_keys(id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL,
  request_hash TEXT NOT NULL,                  -- SHA-256 of body; catches "same key, different body" client bugs
  response_status INTEGER NOT NULL,
  response_body JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (api_key_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_pik_created ON public.partner_idempotency_keys(created_at);

COMMENT ON TABLE public.partner_idempotency_keys IS
  'Idempotency cache for partner POSTs. 24-hour retention swept by partner-logs-retention cron.';

-- ── 8. partner_api_logs (monthly-partitioned) ───────────────────────────────

CREATE TABLE IF NOT EXISTS public.partner_api_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id),
  api_key_id UUID REFERENCES public.partner_api_keys(id) ON DELETE SET NULL,
  actor_external_id TEXT,                      -- from X-MG-Actor when present
  request_id TEXT NOT NULL,
  method TEXT NOT NULL,
  path TEXT NOT NULL,
  query_params JSONB,
  status_code INTEGER,
  duration_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

DO $$
DECLARE
  m INT;
  part_start DATE;
  part_end DATE;
  part_name TEXT;
BEGIN
  FOR m IN 0..2 LOOP
    part_start := date_trunc('month', now() + (m || ' month')::interval)::date;
    part_end := (part_start + interval '1 month')::date;
    part_name := 'partner_api_logs_' || to_char(part_start, 'YYYYMM');
    EXECUTE format(
      'CREATE TABLE IF NOT EXISTS public.%I PARTITION OF public.partner_api_logs FOR VALUES FROM (%L) TO (%L)',
      part_name, part_start, part_end
    );
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS idx_pal_key_time ON public.partner_api_logs (api_key_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pal_org_time ON public.partner_api_logs (org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pal_status ON public.partner_api_logs (status_code) WHERE status_code >= 400;

COMMENT ON TABLE public.partner_api_logs IS
  'Every partner API request, for audit + self-serve debugging. Monthly range-partitioned; 90-day retention swept by partner-logs-retention cron.';

-- ── 9. RLS — all tables platform-internal ───────────────────────────────────
--
-- Partners never query Supabase directly. The Next.js API layer holds a
-- service-role client and reads/writes these tables on the partner's behalf
-- with app-layer scope enforcement. Dashboards / admins can read via RLS.

ALTER TABLE public.partner_api_keys               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_actors                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_webhook_subscriptions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_event_outbox           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_webhook_deliveries     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_idempotency_keys       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_api_logs               ENABLE ROW LEVEL SECURITY;

-- Platform-internal select policies (admins + super_admins)
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'partner_api_keys',
    'partner_actors',
    'partner_webhook_subscriptions',
    'partner_event_outbox',
    'partner_webhook_deliveries',
    'partner_idempotency_keys',
    'partner_api_logs'
  ]) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_select_platform', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.auth_is_platform_user() OR public.auth_is_super_admin())',
      t || '_select_platform', t
    );
  END LOOP;
END $$;

-- No INSERT/UPDATE/DELETE policies — service-role only, which bypasses RLS.
-- This is intentional: partner-scoped writes all go through the Next.js API
-- layer which holds the service-role key and enforces the scope in app code.

-- ── 10. Retention helpers ───────────────────────────────────────────────────

-- Rolling-partition creator — called monthly by the retention cron to pre-create
-- next month's partitions so writes never block on partition-not-found.
CREATE OR REPLACE FUNCTION public.ensure_partner_partitions(p_months_ahead INT DEFAULT 2)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  m INT;
  part_start DATE;
  part_end DATE;
  tbl TEXT;
  created_count INT := 0;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['partner_webhook_deliveries', 'partner_api_logs']) LOOP
    FOR m IN 0..p_months_ahead LOOP
      part_start := date_trunc('month', now() + (m || ' month')::interval)::date;
      part_end := (part_start + interval '1 month')::date;
      BEGIN
        EXECUTE format(
          'CREATE TABLE IF NOT EXISTS public.%I PARTITION OF public.%I FOR VALUES FROM (%L) TO (%L)',
          tbl || '_' || to_char(part_start, 'YYYYMM'), tbl, part_start, part_end
        );
        created_count := created_count + 1;
      EXCEPTION WHEN duplicate_table THEN
        -- already exists, skip
        NULL;
      END;
    END LOOP;
  END LOOP;
  RETURN created_count;
END;
$$;

-- Drop old partitions older than N days (90 for logs/deliveries).
-- Called by partner-logs-retention cron. Returns list of dropped partition names.
CREATE OR REPLACE FUNCTION public.drop_old_partner_partitions(p_retention_days INT DEFAULT 90)
RETURNS SETOF TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cutoff DATE := (now() - (p_retention_days || ' days')::interval)::date;
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT c.relname AS part_name,
           regexp_replace(c.relname, '.*_(\d{6})$', '\1') AS yyyymm
      FROM pg_inherits i
      JOIN pg_class c ON c.oid = i.inhrelid
      JOIN pg_class p ON p.oid = i.inhparent
     WHERE p.relname IN ('partner_webhook_deliveries', 'partner_api_logs')
       AND c.relname ~ '_\d{6}$'
  LOOP
    -- Partition represents month whose first day is to_date(yyyymm, 'YYYYMM').
    -- Drop if the month END (first of next month) is older than cutoff.
    IF (to_date(rec.yyyymm, 'YYYYMM') + interval '1 month')::date < cutoff THEN
      EXECUTE format('DROP TABLE IF EXISTS public.%I', rec.part_name);
      RETURN NEXT rec.part_name;
    END IF;
  END LOOP;
END;
$$;

-- Idempotency key sweep — partner_idempotency_keys is not partitioned (tiny
-- volume, 24h retention makes DELETE cheap enough).
CREATE OR REPLACE FUNCTION public.sweep_partner_idempotency_keys(p_retention_hours INT DEFAULT 24)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INT;
BEGIN
  DELETE FROM public.partner_idempotency_keys
   WHERE created_at < now() - (p_retention_hours || ' hours')::interval;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Grant execute to service_role only (retention cron uses service role).
GRANT EXECUTE ON FUNCTION public.ensure_partner_partitions(INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.drop_old_partner_partitions(INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.sweep_partner_idempotency_keys(INT) TO service_role;

-- ── 11. Emit helper for the transactional outbox ────────────────────────────
--
-- Called from mutation sites (lib/api/engineering.ts, lib/api/projects.ts) via
-- emitPartnerEvent(). The app-layer helper wraps this RPC so the TS type is
-- type-checked; the SQL function exists to allow the insert to run inside the
-- same transaction as the mutation when the mutation is itself an RPC.

CREATE OR REPLACE FUNCTION public.partner_emit_event(
  p_event_type TEXT,
  p_payload JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id UUID := gen_random_uuid();
BEGIN
  INSERT INTO public.partner_event_outbox (event_type, event_id, payload)
  VALUES (p_event_type, v_event_id, p_payload);
  RETURN v_event_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.partner_emit_event(TEXT, JSONB) TO service_role;

-- ── 12. Seed reference rows — no-op, partners seeded via admin UI ──────────

COMMENT ON CONSTRAINT organizations_org_type_check ON public.organizations IS
  'Tenant types in the EDGE multi-org platform. sales_d2d added 2026-04-16 for D2D sales apps (Solicit). Chain types (direct_supply_equity_corp, newco_distribution) added 2026-04-13 per Mark Bench''s methodology.';
