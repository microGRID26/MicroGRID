-- 073: Create storage bucket for rep file uploads (license photos, W-9, ICA)
-- Run in Supabase SQL editor

INSERT INTO storage.buckets (id, name, public)
VALUES ('rep-files', 'rep-files', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to read files
CREATE POLICY "rep_files_storage_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'rep-files');

-- Allow admin users to upload files
CREATE POLICY "rep_files_storage_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'rep-files');

-- Allow admin users to delete files
CREATE POLICY "rep_files_storage_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'rep-files');
