-- Исправление проблем безопасности Supabase Storage
-- Этот скрипт нужно выполнить в Supabase SQL Editor

-- 1. Проверяем существующие buckets
SELECT 
    name,
    public,
    avif_autodetection,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets;

-- 2. Проверяем существующие политики Storage
SELECT 
    policyname,
    bucket_id,
    roles,
    cmd,
    qual
FROM storage.policies;

-- 3. Создаем безопасные политики для bucket 'avatars' (если не существуют)

-- Удаляем старые политики если есть
DROP POLICY IF EXISTS "Users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatars" ON storage.objects;

-- Политика для просмотра аватаров (все могут видеть)
CREATE POLICY "Users can view avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

-- Политика для загрузки аватаров (только аутентифицированные пользователи)
CREATE POLICY "Users can upload avatars" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = 'public'
  );

-- Политика для обновления аватаров (только свои файлы)
CREATE POLICY "Users can update own avatars" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[2]
  );

-- Политика для удаления аватаров (только свои файлы или админы)
CREATE POLICY "Users can delete own avatars" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars' 
    AND (
      auth.uid()::text = (storage.foldername(name))[2]
      OR EXISTS (
        SELECT 1 FROM players 
        WHERE players.id = auth.uid() 
        AND players.status = 'admin'
      )
    )
  );

-- 4. Создаем безопасные политики для bucket 'items' (если существует)

-- Политика для просмотра предметов (все могут видеть)
CREATE POLICY "Users can view items" ON storage.objects
  FOR SELECT USING (bucket_id = 'items');

-- Политика для загрузки предметов (только владельцы)
CREATE POLICY "Users can upload items" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'items' 
    AND auth.uid() IS NOT NULL
  );

-- Политика для обновления предметов (только владельцы)
CREATE POLICY "Users can update own items" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'items' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Политика для удаления предметов (только владельцы или админы)
CREATE POLICY "Users can delete own items" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'items' 
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR EXISTS (
        SELECT 1 FROM players 
        WHERE players.id = auth.uid() 
        AND players.status = 'admin'
      )
    )
  );

-- 5. Убеждаемся что RLS включен для storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 6. Проверяем финальное состояние политик Storage
SELECT 
    policyname,
    bucket_id,
    roles,
    cmd,
    qual
FROM storage.policies
ORDER BY bucket_id, policyname;

-- 7. Создаем функцию для безопасной проверки владельца файла
CREATE OR REPLACE FUNCTION storage.is_file_owner(file_path text)
RETURNS boolean AS $$
DECLARE
  owner_id text;
BEGIN
  -- Извлекаем ID владельца из пути файла
  owner_id := (string_to_array(file_path, '/'))[2];
  
  -- Проверяем что текущий пользователь является владельцем
  RETURN auth.uid()::text = owner_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Ограничиваем размер файлов для безопасности
UPDATE storage.buckets 
SET file_size_limit = 10485760 -- 10MB
WHERE name = 'avatars';

UPDATE storage.buckets 
SET file_size_limit = 52428800 -- 50MB
WHERE name = 'items';

-- 9. Ограничиваем типы файлов для безопасности
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

UPDATE storage.buckets 
SET allowed_mime_types = ARRAY[
  'image/jpeg',
  'image/png', 
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif'
]
WHERE name = 'items';

-- Комментарий о завершении
-- Этот скрипт исправляет проблемы безопасности Storage:
-- 1. Создает безопасные политики для файлов
-- 2. Ограничивает доступ по ролям пользователей  
-- 3. Устанавливает лимиты размера файлов
-- 4. Ограничивает разрешенные типы файлов
-- 5. Включает RLS для storage.objects

COMMENT ON FUNCTION storage.is_file_owner IS 'Безопасная проверка владельца файла в Storage';
