-- Политики для bucket "videos" в Supabase Storage
-- Dashboard -> SQL Editor -> Run

DROP POLICY IF EXISTS "videos_insert_public" ON storage.objects;
CREATE POLICY "videos_insert_public"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'videos');

DROP POLICY IF EXISTS "videos_select_public" ON storage.objects;
CREATE POLICY "videos_select_public"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'videos');

DROP POLICY IF EXISTS "videos_delete_own" ON storage.objects;
CREATE POLICY "videos_delete_own"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'videos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
