-- Скрипт для исправления проблем с доступом к Storage
-- Выполните этот скрипт в SQL Editor в Supabase Dashboard

-- 1. Проверяем текущее состояние
SELECT 'CURRENT BUCKETS:' as info;
SELECT id, name, public, file_size_limit FROM storage.buckets;

SELECT 'CURRENT POLICIES:' as info;
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage';

-- 2. Удаляем все существующие политики для storage.objects
DROP POLICY IF EXISTS "Public Access to Avatars" ON storage.objects;
DROP POLICY IF EXISTS "Upload Access to Avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Upload Access" ON storage.objects;

-- 3. Создаем новые политики для публичного доступа
-- Политика для чтения (SELECT) - публичный доступ
CREATE POLICY "Public Access to Avatars" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

-- Политика для загрузки (INSERT) - любой авторизованный пользователь
CREATE POLICY "Upload Access to Avatars" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'avatars');

-- Политика для обновления (UPDATE) - любой авторизованный пользователь
CREATE POLICY "Update Access to Avatars" ON storage.objects
FOR UPDATE USING (bucket_id = 'avatars');

-- Политика для удаления (DELETE) - любой авторизованный пользователь
CREATE POLICY "Delete Access to Avatars" ON storage.objects
FOR DELETE USING (bucket_id = 'avatars');

-- 4. Проверяем результат
SELECT 'UPDATED POLICIES:' as info;
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage'
ORDER BY policyname;

-- 5. Проверяем RLS (Row Level Security)
SELECT 'RLS STATUS:' as info;
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'storage' AND tablename = 'objects'; 