-- Create storage bucket for ticket attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ticket-attachments',
  'ticket-attachments',
  true,
  5242880, -- 5MB max
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
) ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload
CREATE POLICY "ticket_attachments_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ticket-attachments');

-- Allow public read (images are referenced by URL in comments)
CREATE POLICY "ticket_attachments_read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'ticket-attachments');

-- Add image_url column to ticket_comments
ALTER TABLE ticket_comments ADD COLUMN IF NOT EXISTS image_url TEXT;
