-- 150-storage-paths-for-private-buckets.sql
--
-- Preparing to flip 6 Supabase Storage buckets from public=true to public=false
-- to close the `public_bucket_allows_listing` advisor finding. Any holder of the
-- MG publishable key can currently LIST and GET every object in these buckets.
-- After the flip, reads must go through createSignedUrl(path, ttl) — which
-- takes a path, not a URL. Today most write sites store a full public URL in
-- a `*_url` column; those URLs stop working the moment the bucket flips.
--
-- This migration adds a parallel `*_path` column to every affected table and
-- backfills it by regex-extracting the object path out of the stored public
-- URL. The legacy `*_url` column is kept populated so rollback is a single
-- `alter bucket ... public = true` with zero data loss.
--
-- Once the app code has soaked on path-based reads for a release or two,
-- a follow-up migration can drop the `*_url` columns.
--
-- Bucket → table/column map:
--   wo-photos          → wo_checklist_items.photo_url  / .photo_path
--   ticket-attachments → ticket_comments.image_url     / .image_path
--   rep-files          → rep_files.file_url            / .file_path
--   customer-feedback  → customer_feedback_attachments.file_url / .file_path
--   spoke-feedback     → spoke_feedback.attachment_url / .attachment_path
--   Project-documents  → (no code writer found — flip checked separately)
--
-- R1 2026-04-23 High #5 fix: each backfill regex pins the host to the
-- current MG project ref (hzymsezqfxzpbcqryeim). Without this an errant
-- legacy row pointing at a different Supabase project could have its path
-- blindly extracted and signed against MG's bucket with the service key.

begin;

-- 1. wo_checklist_items (wo-photos bucket)
alter table public.wo_checklist_items
  add column if not exists photo_path text;

update public.wo_checklist_items
set photo_path = regexp_replace(
  photo_url,
  '^https://hzymsezqfxzpbcqryeim\.supabase\.co/storage/v1/object/(?:public/)?wo-photos/',
  ''
)
where photo_url is not null
  and photo_path is null
  and photo_url ~ '^https://hzymsezqfxzpbcqryeim\.supabase\.co/storage/v1/object/(?:public/)?wo-photos/';

-- 2. ticket_comments (ticket-attachments bucket)
alter table public.ticket_comments
  add column if not exists image_path text;

update public.ticket_comments
set image_path = regexp_replace(
  image_url,
  '^https://hzymsezqfxzpbcqryeim\.supabase\.co/storage/v1/object/(?:public/)?ticket-attachments/',
  ''
)
where image_url is not null
  and image_path is null
  and image_url ~ '^https://hzymsezqfxzpbcqryeim\.supabase\.co/storage/v1/object/(?:public/)?ticket-attachments/';

-- 3. rep_files (rep-files bucket)
alter table public.rep_files
  add column if not exists file_path text;

update public.rep_files
set file_path = regexp_replace(
  file_url,
  '^https://hzymsezqfxzpbcqryeim\.supabase\.co/storage/v1/object/(?:public/)?rep-files/',
  ''
)
where file_url is not null
  and file_path is null
  and file_url ~ '^https://hzymsezqfxzpbcqryeim\.supabase\.co/storage/v1/object/(?:public/)?rep-files/';

-- 4. customer_feedback_attachments (customer-feedback bucket)
alter table public.customer_feedback_attachments
  add column if not exists file_path text;

update public.customer_feedback_attachments
set file_path = regexp_replace(
  file_url,
  '^https://hzymsezqfxzpbcqryeim\.supabase\.co/storage/v1/object/(?:public/)?customer-feedback/',
  ''
)
where file_url is not null
  and file_path is null
  and file_url ~ '^https://hzymsezqfxzpbcqryeim\.supabase\.co/storage/v1/object/(?:public/)?customer-feedback/';

-- 5. spoke_feedback (spoke-feedback bucket)
alter table public.spoke_feedback
  add column if not exists attachment_path text;

update public.spoke_feedback
set attachment_path = regexp_replace(
  attachment_url,
  '^https://hzymsezqfxzpbcqryeim\.supabase\.co/storage/v1/object/(?:public/)?spoke-feedback/',
  ''
)
where attachment_url is not null
  and attachment_path is null
  and attachment_url ~ '^https://hzymsezqfxzpbcqryeim\.supabase\.co/storage/v1/object/(?:public/)?spoke-feedback/';

-- Backfill sanity: log how many rows got a path vs still-null so Greg can spot
-- check before flipping the buckets. Only a RAISE NOTICE — migration is
-- idempotent and the counts are not persisted.
do $$
declare
  wo_filled int; wo_null int;
  tc_filled int; tc_null int;
  rf_filled int; rf_null int;
  cfa_filled int; cfa_null int;
  sf_filled int; sf_null int;
begin
  select count(*) filter (where photo_path is not null),
         count(*) filter (where photo_url is not null and photo_path is null)
    into wo_filled, wo_null from public.wo_checklist_items;
  select count(*) filter (where image_path is not null),
         count(*) filter (where image_url is not null and image_path is null)
    into tc_filled, tc_null from public.ticket_comments;
  select count(*) filter (where file_path is not null),
         count(*) filter (where file_url is not null and file_path is null)
    into rf_filled, rf_null from public.rep_files;
  select count(*) filter (where file_path is not null),
         count(*) filter (where file_url is not null and file_path is null)
    into cfa_filled, cfa_null from public.customer_feedback_attachments;
  select count(*) filter (where attachment_path is not null),
         count(*) filter (where attachment_url is not null and attachment_path is null)
    into sf_filled, sf_null from public.spoke_feedback;

  raise notice 'backfill summary:';
  raise notice '  wo_checklist_items.photo_path: filled=%, legacy-url-without-path=%', wo_filled, wo_null;
  raise notice '  ticket_comments.image_path: filled=%, legacy-url-without-path=%', tc_filled, tc_null;
  raise notice '  rep_files.file_path: filled=%, legacy-url-without-path=%', rf_filled, rf_null;
  raise notice '  customer_feedback_attachments.file_path: filled=%, legacy-url-without-path=%', cfa_filled, cfa_null;
  raise notice '  spoke_feedback.attachment_path: filled=%, legacy-url-without-path=%', sf_filled, sf_null;
end $$;

-- 6. atlas_list_spoke_feedback — add attachment_path to the return shape so
-- ATLAS-HQ's /feedback page can sign on the server side instead of relying on
-- the bucket being public. The RPC signature changes (new column), so drop-
-- and-recreate rather than CREATE OR REPLACE.
drop function if exists public.atlas_list_spoke_feedback(timestamptz, integer);

create or replace function public.atlas_list_spoke_feedback(
  p_since timestamptz default null,
  p_limit integer default 50
)
returns table (
  id uuid,
  category text,
  status text,
  rating integer,
  message text,
  rider_name text,
  screen_path text,
  app_version text,
  attachment_url text,
  attachment_path text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    f.id,
    f.category,
    f.status,
    f.rating,
    f.message,
    f.rider_name,
    f.screen_path,
    f.app_version,
    f.attachment_url,
    f.attachment_path,
    f.created_at
  from public.spoke_feedback f
  where p_since is null or f.created_at >= p_since
  order by f.created_at desc
  limit greatest(1, least(coalesce(p_limit, 50), 500));
$$;

revoke execute on function public.atlas_list_spoke_feedback(timestamptz, integer) from public, anon, authenticated;
grant execute on function public.atlas_list_spoke_feedback(timestamptz, integer) to service_role;

commit;
