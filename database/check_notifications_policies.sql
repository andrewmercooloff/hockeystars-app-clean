-- Проверяем RLS политики для таблицы notifications
-- Выполните этот скрипт в Supabase Dashboard -> SQL Editor

-- 1. Проверяем, включен ли RLS
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'notifications';

-- 2. Проверяем существующие политики
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'notifications';

-- 3. Проверяем структуру таблицы notifications
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'notifications'
ORDER BY ordinal_position;

-- 4. Проверяем, есть ли уведомления в базе вообще
SELECT 
  id,
  user_id,
  type,
  title,
  is_read,
  created_at
FROM notifications
ORDER BY created_at DESC
LIMIT 10;

-- 5. Проверяем уведомления для конкретного пользователя (замените на нужный ID)
-- user_id из лога: d6029aa2-5047-4d2e-927d-741de6292af5
SELECT 
  id,
  user_id,
  type,
  title,
  is_read,
  created_at
FROM notifications
WHERE user_id = 'd6029aa2-5047-4d2e-927d-741de6292af5'::uuid
ORDER BY created_at DESC;

-- 6. Проверяем типы данных user_id
SELECT 
  pg_typeof(user_id) as user_id_type,
  pg_typeof(auth.uid()) as auth_uid_type
FROM notifications
LIMIT 1;

