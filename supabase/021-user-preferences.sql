-- User preferences table for persisting UI settings
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id TEXT PRIMARY KEY,
  homepage TEXT DEFAULT '/command',
  default_pm_filter TEXT,
  collapsed_sections JSONB DEFAULT '{}',
  queue_card_fields JSONB DEFAULT '["name","city","financier","contract"]',
  export_presets JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS: users can only read/write their own row
CREATE POLICY "prefs_own" ON public.user_preferences FOR ALL TO authenticated
  USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);
