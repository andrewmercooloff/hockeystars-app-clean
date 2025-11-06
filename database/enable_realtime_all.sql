-- Включение Realtime для всех таблиц приложения в Supabase
-- Выполните этот скрипт в Supabase SQL Editor
-- Упрощенная версия

-- 1. Включаем Realtime для таблицы messages (для сообщений в реальном времени)
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- 2. Включаем Realtime для таблицы players (для статусов онлайн/офлайн)
ALTER PUBLICATION supabase_realtime ADD TABLE players;
ALTER TABLE public.players REPLICA IDENTITY FULL;

-- 3. Проверяем результат для messages
SELECT 
  'messages' as table_name,
  relreplident,
  CASE 
    WHEN relreplident = 'f' THEN '✅ FULL (правильно)'
    WHEN relreplident = 'd' THEN '⚠️ DEFAULT (может работать)'
    ELSE '❌ Не настроено'
  END as replication_status
FROM pg_class
WHERE relname = 'messages';

-- 4. Проверяем результат для players
SELECT 
  'players' as table_name,
  relreplident,
  CASE 
    WHEN relreplident = 'f' THEN '✅ FULL (правильно)'
    WHEN relreplident = 'd' THEN '⚠️ DEFAULT (может работать)'
    ELSE '❌ Не настроено'
  END as replication_status
FROM pg_class
WHERE relname = 'players';

-- Готово! Теперь:
-- ✅ Сообщения обновляются в реальном времени
-- ✅ Статусы онлайн/офлайн обновляются в реальном времени
-- Перезапустите приложение для применения изменений.

