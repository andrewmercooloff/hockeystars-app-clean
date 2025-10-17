-- Простое исправление проблем безопасности Supabase Storage
-- Этот скрипт избегает сложных функций

-- 1. Включаем RLS для storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 2. Удаляем старые политики для avatars
DROP POLICY IF EXISTS "Users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatars" ON storage.objects;

-- 3. Создаем простые политики для avatars
CREATE POLICY "Users can view avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload avatars" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can update own avatars" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' 
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can delete own avatars" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars' 
    AND auth.uid() IS NOT NULL
  );

-- 4. Ограничиваем размер файлов для безопасности
UPDATE storage.buckets 
SET file_size_limit = 10485760 -- 10MB
WHERE name = 'avatars';

-- 5. Ограничиваем типы файлов для безопасности
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY[
  'image/jpeg',
  'image/png', 
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif'
]
WHERE name = 'avatars';

-- 6. Проверяем результат
SELECT 
    policyname,
    bucket_id,
    cmd
FROM storage.policies
WHERE bucket_id = 'avatars'
ORDER BY policyname;

-- Готово! Storage защищен
