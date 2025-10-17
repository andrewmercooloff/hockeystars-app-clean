-- Обновление таблицы stats_changes для поддержки дробных чисел
-- Этот скрипт изменяет типы данных полей для поддержки нормативов

-- Изменяем типы данных полей на NUMERIC для поддержки дробных чисел
ALTER TABLE stats_changes 
  ALTER COLUMN old_value TYPE NUMERIC(10,2),
  ALTER COLUMN new_value TYPE NUMERIC(10,2),
  ALTER COLUMN change_value TYPE NUMERIC(10,2);

-- Обновляем существующие данные, конвертируя INTEGER в NUMERIC
UPDATE stats_changes 
SET 
  old_value = old_value::NUMERIC(10,2),
  new_value = new_value::NUMERIC(10,2),
  change_value = change_value::NUMERIC(10,2);

-- Проверяем результат
SELECT 
  column_name, 
  data_type, 
  numeric_precision, 
  numeric_scale
FROM information_schema.columns 
WHERE table_name = 'stats_changes' 
  AND column_name IN ('old_value', 'new_value', 'change_value');
