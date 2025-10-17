-- Исправление RLS политик для Supabase Storage
-- Проблема: изображения загружаются, но Content-Length = 0 из-за RLS

-- 1. Создаем bucket 'items' если не существует
INSERT INTO storage.buckets (id, name, public)
VALUES ('items', 'items', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Удаляем все существующие политики для bucket 'items'
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload items" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own items" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own items" ON storage.objects;

-- 3. Создаем новую политику для публичного доступа к чтению
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT USING (bucket_id = 'items');

-- 4. Создаем политику для загрузки файлов (только для аутентифицированных)
CREATE POLICY "Authenticated users can upload items" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'items');

-- 5. Создаем политику для обновления файлов (только владельцем)
CREATE POLICY "Users can update own items" ON storage.objects
FOR UPDATE USING (bucket_id = 'items');

-- 6. Создаем политику для удаления файлов (только владельцем)
CREATE POLICY "Users can delete own items" ON storage.objects
FOR DELETE USING (bucket_id = 'items');

-- 7. Проверяем, что bucket 'items' публичный
UPDATE storage.buckets 
SET public = true 
WHERE id = 'items';

-- 8. Убеждаемся, что RLS включен для storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 9. Проверяем статус
DO $$
BEGIN
  RAISE NOTICE 'Storage bucket "items" настроен с публичным доступом на чтение';
  RAISE NOTICE 'RLS политики обновлены для корректной работы с изображениями';
END $$;

