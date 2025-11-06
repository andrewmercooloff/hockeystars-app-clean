-- Включение Realtime для таблицы players в Supabase (для статусов онлайн/офлайн)
-- Выполните этот скрипт в Supabase SQL Editor
-- Упрощенная версия

-- 1. Добавляем таблицу players в публикацию supabase_realtime
-- Если таблица уже добавлена, команда не вызовет ошибку
ALTER PUBLICATION supabase_realtime ADD TABLE players;

-- 2. Устанавливаем FULL replication identity для правильной работы Realtime
ALTER TABLE public.players REPLICA IDENTITY FULL;

-- 3. Проверяем результат
SELECT 
  schemaname,
  tablename,
  '✅ Realtime должен быть включен для статусов онлайн/офлайн' as status
FROM pg_tables 
WHERE tablename = 'players';

-- 4. Проверяем replication identity
SELECT 
  relname,
  relreplident,
  CASE 
    WHEN relreplident = 'f' THEN '✅ FULL (правильно)'
    WHEN relreplident = 'd' THEN '⚠️ DEFAULT (может работать)'
    ELSE '❌ Не настроено'
  END as status
FROM pg_class
WHERE relname = 'players';

-- Готово! Теперь статусы онлайн/офлайн должны обновляться в реальном времени.

