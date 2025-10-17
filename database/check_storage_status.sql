-- Скрипт для проверки текущего состояния Storage
-- Выполните этот скрипт в SQL Editor в Supabase Dashboard

-- 1. Проверяем существующие buckets
SELECT 'BUCKETS:' as info;
SELECT id, name, public, file_size_limit, allowed_mime_types 
FROM storage.buckets 
ORDER BY name;

-- 2. Проверяем политики для storage.objects
SELECT 'POLICIES:' as info;
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
ORDER BY policyname;

-- 3. Проверяем RLS (Row Level Security)
SELECT 'RLS STATUS:' as info;
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'storage' 
AND tablename = 'objects'; 