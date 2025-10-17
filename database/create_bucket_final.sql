-- Финальный скрипт для создания bucket avatars
-- Выполните этот скрипт в SQL Editor в Supabase Dashboard

-- 1. Проверяем, существует ли bucket
SELECT 'CHECKING EXISTING BUCKETS:' as info;
SELECT id, name, public, file_size_limit FROM storage.buckets;

-- 2. Создаем bucket avatars (если не существует)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET 
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- 3. Проверяем создание
SELECT 'BUCKET CREATED/UPDATED:' as info;
SELECT id, name, public, file_size_limit, allowed_mime_types FROM storage.buckets WHERE id = 'avatars';

-- 4. Удаляем старые политики (если есть)
DROP POLICY IF EXISTS "Public Access to Avatars" ON storage.objects;
DROP POLICY IF EXISTS "Upload Access to Avatars" ON storage.objects;
DROP POLICY IF EXISTS "Update Access to Avatars" ON storage.objects;
DROP POLICY IF EXISTS "Delete Access to Avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Upload Access" ON storage.objects;

-- 5. Создаем новые политики
CREATE POLICY "Public Access to Avatars" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Upload Access to Avatars" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Update Access to Avatars" ON storage.objects
FOR UPDATE USING (bucket_id = 'avatars');

CREATE POLICY "Delete Access to Avatars" ON storage.objects
FOR DELETE USING (bucket_id = 'avatars');

-- 6. Проверяем политики
SELECT 'POLICIES CREATED:' as info;
SELECT policyname, cmd FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage'
ORDER BY policyname;

-- 7. Финальная проверка
SELECT 'FINAL STATUS:' as info;
SELECT 'Bucket exists:' as check_type, 
       CASE WHEN EXISTS(SELECT 1 FROM storage.buckets WHERE id = 'avatars') 
            THEN 'YES' ELSE 'NO' END as result
UNION ALL
SELECT 'Bucket is public:' as check_type,
       CASE WHEN EXISTS(SELECT 1 FROM storage.buckets WHERE id = 'avatars' AND public = true)
            THEN 'YES' ELSE 'NO' END as result
UNION ALL
SELECT 'Policies exist:' as check_type,
       CASE WHEN EXISTS(SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage')
            THEN 'YES' ELSE 'NO' END as result; 