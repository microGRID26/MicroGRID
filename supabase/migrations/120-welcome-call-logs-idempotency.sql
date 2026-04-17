-- Migration 120: webhook replay protection on welcome_call_logs.
--
-- R1 audit 2026-04-17 (unconventional angles): /api/webhooks/subhub-vwc had no
-- timestamp window and no idempotency key, so an attacker holding one valid
-- captured signature could replay the payload N times to spam log rows (no
-- state mutation yet, but phase-2 parsing would pick up the same event N times).
--
-- Fix: payload_hash column + unique partial index on (source_id, event_type,
-- payload_hash). Handler computes sha256 of the raw body and inserts; a
-- duplicate hits the unique constraint and the handler returns
-- `{received:true, duplicate:true}`. Matches the dedup pattern already used on
-- `/api/webhooks/edge` (payload_hash column there, introduced migration ~070s).

alter table public.welcome_call_logs
  add column if not exists payload_hash text;

-- Backfill nothing — the hash is forward-only. Old rows stay null.

create unique index if not exists welcome_call_logs_dedup_idx
  on public.welcome_call_logs (source_id, event_type, payload_hash)
  where payload_hash is not null;
