-- Проверка и настройка Realtime для таблицы friend_requests

-- 1. Проверяем, включен ли Realtime для таблицы friend_requests
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- 2. Если таблицы нет в списке, добавляем её
-- ВАЖНО: Выполните эту команду, если friend_requests отсутствует в результате выше
ALTER PUBLICATION supabase_realtime ADD TABLE friend_requests;

-- 3. Устанавливаем REPLICA IDENTITY FULL для получения старых данных при DELETE
-- ВАЖНО: Это позволяет получать payload.old с полными данными при удалении
ALTER TABLE friend_requests REPLICA IDENTITY FULL;

-- 4. Проверяем текущий REPLICA IDENTITY
SELECT relname, relreplident 
FROM pg_class 
WHERE relname = 'friend_requests';
-- d = default (только primary key в OLD)
-- f = full (все колонки в OLD)
-- n = nothing
-- i = using index



























