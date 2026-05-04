-- Migration: add notification_sound_url to settings table
-- Run this on the Supabase instance: https://supabaseolharosol.newappai.com

-- 1. Add the notification_sound_url column to the settings table
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS notification_sound_url text DEFAULT '';

-- 2. Create the notification-sounds storage bucket (public, so URLs are accessible)
INSERT INTO storage.buckets (id, name, public)
VALUES ('notification-sounds', 'notification-sounds', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage policy: allow authenticated users to upload sounds
CREATE POLICY IF NOT EXISTS "Pizzaria can upload notification sounds"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'notification-sounds');

-- 4. Storage policy: allow public read access to notification sounds
CREATE POLICY IF NOT EXISTS "Public can read notification sounds"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'notification-sounds');
