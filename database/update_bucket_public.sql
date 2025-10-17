-- Обновление существующего bucket avatars в публичный
-- Выполните этот скрипт в SQL Editor в Supabase Dashboard

-- Обновляем существующий bucket, делая его публичным
UPDATE storage.buckets 
SET public = true 
WHERE name = 'avatars';

-- Удаляем старые политики (если есть)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Upload Access" ON storage.objects;
DROP POLICY IF EXISTS "Public Access to Avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete avatars" ON storage.objects;

-- Создаем политики для публичного доступа

-- Политика для чтения (публичный доступ)
CREATE POLICY "Public Access to Avatars" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

-- Политика для загрузки (любой аутентифицированный пользователь)
CREATE POLICY "Anyone can upload avatars" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'avatars');

-- Политика для обновления (любой аутентифицированный пользователь)
CREATE POLICY "Anyone can update avatars" ON storage.objects
FOR UPDATE USING (bucket_id = 'avatars');

-- Политика для удаления (любой аутентифицированный пользователь)
CREATE POLICY "Anyone can delete avatars" ON storage.objects
FOR DELETE USING (bucket_id = 'avatars');

-- Проверяем результат
SELECT * FROM storage.buckets WHERE name = 'avatars'; 