-- Скрипт для настройки bucket avatars как публичного
-- Выполните этот скрипт в SQL Editor в Supabase Dashboard

-- 1. Обновляем bucket avatars, делая его публичным
UPDATE storage.buckets 
SET public = true 
WHERE id = 'avatars';

-- 2. Проверяем результат
SELECT 'UPDATED BUCKET:' as info;
SELECT id, name, public, file_size_limit, allowed_mime_types 
FROM storage.buckets 
WHERE id = 'avatars';

-- 3. Если bucket не существует, создаем его
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

-- 4. Финальная проверка
SELECT 'FINAL BUCKET STATUS:' as info;
SELECT id, name, public, file_size_limit, allowed_mime_types 
FROM storage.buckets 
WHERE id = 'avatars'; 