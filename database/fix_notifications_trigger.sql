-- Исправление проблемы с триггером updated_at в таблице notifications

-- Проверяем текущие триггеры на таблице notifications
SELECT 
    trigger_name, 
    event_manipulation, 
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'notifications';

-- Удаляем триггер, который пытается обновить несуществующее поле updated_at
DROP TRIGGER IF EXISTS handle_updated_at ON public.notifications;

-- Если нужно, можно добавить поле updated_at
-- ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Или создать новый триггер, который работает правильно
-- CREATE TRIGGER handle_updated_at 
-- BEFORE UPDATE ON public.notifications 
-- FOR EACH ROW 
-- EXECUTE FUNCTION moddatetime (updated_at);

-- Проверяем результат
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'notifications' 
  AND table_schema = 'public'
ORDER BY ordinal_position;



