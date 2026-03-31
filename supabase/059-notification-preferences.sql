-- Migration 059: Add notification preferences column to user_preferences
-- Stores per-user notification toggle settings as JSONB

ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS notification_prefs JSONB DEFAULT '{"blocked":true,"stuck_tasks":true,"mentions":true,"digest_email":true,"stuck_email":true}'::jsonb;
