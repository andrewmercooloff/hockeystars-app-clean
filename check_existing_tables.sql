-- Проверка существующих таблиц
-- Выполните этот скрипт в Supabase SQL Editor

-- Проверяем существующие таблицы
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('items', 'item_requests', 'player_museum')
ORDER BY table_name;

-- Проверяем структуру таблицы items (если существует)
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'items' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Проверяем существующие индексы
SELECT indexname, tablename 
FROM pg_indexes 
WHERE tablename IN ('items', 'item_requests', 'player_museum')
AND schemaname = 'public';

-- Проверяем RLS политики
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename IN ('items', 'item_requests', 'player_museum')
AND schemaname = 'public';

