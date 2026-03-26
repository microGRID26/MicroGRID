-- Migration 031: Email onboarding tracking table
-- Tracks 30-day onboarding email series per user

CREATE TABLE IF NOT EXISTS public.email_onboarding (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_email TEXT NOT NULL,
  user_name TEXT,
  current_day INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT now(),
  last_sent_at TIMESTAMPTZ,
  paused BOOLEAN DEFAULT false,
  completed BOOLEAN DEFAULT false
);

CREATE INDEX idx_email_onboarding_user ON email_onboarding(user_id);
CREATE INDEX idx_email_onboarding_email ON email_onboarding(user_email);

ALTER TABLE email_onboarding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "eo_select" ON email_onboarding FOR SELECT TO authenticated USING (true);
CREATE POLICY "eo_insert" ON email_onboarding FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "eo_update" ON email_onboarding FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
