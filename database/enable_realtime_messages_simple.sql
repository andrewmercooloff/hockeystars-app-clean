-- Включение Realtime для таблицы messages в Supabase
-- Выполните этот скрипт в Supabase SQL Editor
-- Упрощенная версия без сложных JOIN

-- 1. Просто добавляем таблицу messages в публикацию supabase_realtime
-- Если таблица уже добавлена, команда не вызовет ошибку
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- 2. Устанавливаем FULL replication identity для правильной работы Realtime
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- 3. Проверяем результат через простой запрос
SELECT 
  schemaname,
  tablename,
  '✅ Realtime должен быть включен' as status
FROM pg_tables 
WHERE tablename = 'messages';

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
WHERE relname = 'messages';

-- Готово! Теперь Realtime должен работать для таблицы messages.
-- Перезапустите приложение или переоткройте чат для проверки.

