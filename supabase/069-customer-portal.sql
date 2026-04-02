-- Migration 069: Customer Portal
-- Phase 1: customer_accounts, customer_chat_sessions, RLS policies
-- Enables magic-link auth for homeowners to track their solar installation project

-- ── Customer Accounts ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.customer_accounts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id        UUID UNIQUE,
  email               TEXT NOT NULL UNIQUE,
  name                TEXT NOT NULL,
  phone               TEXT,
  project_id          TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  status              TEXT NOT NULL DEFAULT 'invited'
                      CHECK (status IN ('invited', 'active', 'suspended')),
  invited_by          TEXT,
  invited_at          TIMESTAMPTZ DEFAULT now(),
  last_login_at       TIMESTAMPTZ,
  notification_prefs  JSONB DEFAULT '{"email_updates": true, "sms_updates": false}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_accounts_email ON customer_accounts(email);
CREATE INDEX IF NOT EXISTS idx_customer_accounts_project ON customer_accounts(project_id);
CREATE INDEX IF NOT EXISTS idx_customer_accounts_auth_user ON customer_accounts(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_customer_accounts_status ON customer_accounts(status);

-- Auto-update updated_at
CREATE TRIGGER update_customer_accounts_updated_at
  BEFORE UPDATE ON customer_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Customer Chat Sessions ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.customer_chat_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id    UUID NOT NULL REFERENCES customer_accounts(id) ON DELETE CASCADE,
  project_id    TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  messages      JSONB NOT NULL DEFAULT '[]',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_account ON customer_chat_sessions(account_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_project ON customer_chat_sessions(project_id);

CREATE TRIGGER update_chat_sessions_updated_at
  BEFORE UPDATE ON customer_chat_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── RLS: Customer Accounts ─────────────────────────────────────────────────

ALTER TABLE customer_accounts ENABLE ROW LEVEL SECURITY;

-- Customers see only their own account
CREATE POLICY "customer_own_account_select" ON customer_accounts
  FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid() OR auth_is_admin());

-- Admins can manage all accounts
CREATE POLICY "customer_accounts_admin_insert" ON customer_accounts
  FOR INSERT TO authenticated
  WITH CHECK (auth_is_admin());

CREATE POLICY "customer_accounts_admin_update" ON customer_accounts
  FOR UPDATE TO authenticated
  USING (auth_user_id = auth.uid() OR auth_is_admin());

CREATE POLICY "customer_accounts_admin_delete" ON customer_accounts
  FOR DELETE TO authenticated
  USING (auth_is_super_admin());

-- ── RLS: Chat Sessions ─────────────────────────────────────────────────────

ALTER TABLE customer_chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat_sessions_customer_select" ON customer_chat_sessions
  FOR SELECT TO authenticated
  USING (
    account_id IN (SELECT id FROM customer_accounts WHERE auth_user_id = auth.uid())
    OR auth_is_admin()
  );

CREATE POLICY "chat_sessions_customer_insert" ON customer_chat_sessions
  FOR INSERT TO authenticated
  WITH CHECK (
    account_id IN (SELECT id FROM customer_accounts WHERE auth_user_id = auth.uid())
    OR auth_is_admin()
  );

CREATE POLICY "chat_sessions_customer_update" ON customer_chat_sessions
  FOR UPDATE TO authenticated
  USING (
    account_id IN (SELECT id FROM customer_accounts WHERE auth_user_id = auth.uid())
    OR auth_is_admin()
  );

-- ── RLS: Customer access to project data ───────────────────────────────────
-- These are ADDITIVE policies — Supabase ORs multiple SELECT policies.
-- Existing CRM policies remain unchanged.

-- Projects: customer can read their linked project
CREATE POLICY "customer_project_read" ON projects
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM customer_accounts ca
      WHERE ca.project_id = projects.id
        AND ca.auth_user_id = auth.uid()
        AND ca.status = 'active'
    )
  );

-- Stage history: customer can see their project's history
CREATE POLICY "customer_stage_history_read" ON stage_history
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM customer_accounts ca
      WHERE ca.project_id = stage_history.project_id
        AND ca.auth_user_id = auth.uid()
        AND ca.status = 'active'
    )
  );

-- Schedule: customer can see upcoming visits for their project
CREATE POLICY "customer_schedule_read" ON schedule
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM customer_accounts ca
      WHERE ca.project_id = schedule.project_id
        AND ca.auth_user_id = auth.uid()
        AND ca.status = 'active'
    )
  );

-- Tickets: customer can read and create tickets for their project
CREATE POLICY "customer_tickets_read" ON tickets
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM customer_accounts ca
      WHERE ca.project_id = tickets.project_id
        AND ca.auth_user_id = auth.uid()
        AND ca.status = 'active'
    )
  );

CREATE POLICY "customer_tickets_insert" ON tickets
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM customer_accounts ca
      WHERE ca.project_id = NEW.project_id
        AND ca.auth_user_id = auth.uid()
        AND ca.status = 'active'
    )
  );

-- Ticket comments: customer sees non-internal comments on their tickets
CREATE POLICY "customer_comments_read" ON ticket_comments
  FOR SELECT TO authenticated
  USING (
    is_internal = false AND
    EXISTS (
      SELECT 1 FROM tickets t
      JOIN customer_accounts ca ON ca.project_id = t.project_id
      WHERE t.id = ticket_comments.ticket_id
        AND ca.auth_user_id = auth.uid()
        AND ca.status = 'active'
    )
  );

CREATE POLICY "customer_comments_insert" ON ticket_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tickets t
      JOIN customer_accounts ca ON ca.project_id = t.project_id
      WHERE t.id = ticket_comments.ticket_id
        AND ca.auth_user_id = auth.uid()
        AND ca.status = 'active'
    )
  );
