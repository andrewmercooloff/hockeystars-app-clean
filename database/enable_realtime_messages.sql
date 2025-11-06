-- Включение Realtime для таблицы messages в Supabase
-- Выполните этот скрипт в Supabase SQL Editor

-- 1. Проверяем текущее состояние Realtime для таблицы messages
SELECT 
  p.pubname,
  c.relname as table_name
FROM pg_publication p
JOIN pg_publication_tables pt ON p.oid = pt.pubid
JOIN pg_class c ON pt.relid = c.oid
WHERE c.relname = 'messages';

-- 2. Включаем Realtime для таблицы messages
-- Если таблица уже добавлена, команда не вызовет ошибку благодаря IF NOT EXISTS
DO $$
BEGIN
    -- Проверяем, добавлена ли таблица messages в публикацию supabase_realtime
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_publication_tables pt
        JOIN pg_class c ON pt.relid = c.oid
        JOIN pg_publication p ON pt.pubid = p.oid
        WHERE c.relname = 'messages' 
        AND p.pubname = 'supabase_realtime'
    ) THEN
        -- Добавляем таблицу messages в публикацию supabase_realtime
        ALTER PUBLICATION supabase_realtime ADD TABLE messages;
        RAISE NOTICE '✅ Таблица messages добавлена в публикацию supabase_realtime';
    ELSE
        RAISE NOTICE 'ℹ️ Таблица messages уже добавлена в публикацию supabase_realtime';
    END IF;
END $$;

-- 3. Проверяем, что таблица добавлена
SELECT 
  p.pubname,
  c.relname as table_name,
  '✅ Realtime включен для таблицы messages' as status
FROM pg_publication p
JOIN pg_publication_tables pt ON p.oid = pt.pubid
JOIN pg_class c ON pt.relid = c.oid
WHERE c.relname = 'messages' 
AND p.pubname = 'supabase_realtime';

-- 4. Проверяем настройки таблицы messages
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled,
  relreplident as replication_identity
FROM pg_tables 
WHERE tablename = 'messages';

-- 5. Если replication_identity не установлен, устанавливаем его
-- Это нужно для правильной работы Realtime
DO $$
BEGIN
    -- Проверяем текущий replication identity
    IF EXISTS (
        SELECT 1 
        FROM pg_class c
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE c.relname = 'messages' 
        AND n.nspname = 'public'
        AND c.relreplident = 'd' -- 'd' = default, 'n' = nothing, 'f' = full, 'i' = index
    ) THEN
        -- Устанавливаем FULL replication identity для лучшей работы Realtime
        ALTER TABLE public.messages REPLICA IDENTITY FULL;
        RAISE NOTICE '✅ Replication identity установлен в FULL для таблицы messages';
    ELSE
        RAISE NOTICE 'ℹ️ Replication identity уже настроен для таблицы messages';
    END IF;
END $$;

-- 6. Финальная проверка
SELECT 
  '✅ Realtime включен для таблицы messages' as result,
  p.pubname,
  c.relname as table_name
FROM pg_publication p
JOIN pg_publication_tables pt ON p.oid = pt.pubid
JOIN pg_class c ON pt.relid = c.oid
WHERE c.relname = 'messages' 
AND p.pubname = 'supabase_realtime';

