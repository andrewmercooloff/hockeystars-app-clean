-- SQL скрипт для добавления колонок переводов в таблицу exercises
-- Выполните этот скрипт ПЕРЕД обновлением переводов

-- Добавляем колонки для переводов названий упражнений
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS title_pl VARCHAR(255);
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS title_sv VARCHAR(255);
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS title_cs VARCHAR(255);
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS title_sk VARCHAR(255);
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS title_fi VARCHAR(255);
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS title_it VARCHAR(255);
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS title_de VARCHAR(255);
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS title_fr VARCHAR(255);

-- Добавляем колонки для переводов инструкций (JSON массивы)
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS instructions_pl JSONB;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS instructions_sv JSONB;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS instructions_cs JSONB;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS instructions_sk JSONB;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS instructions_fi JSONB;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS instructions_it JSONB;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS instructions_de JSONB;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS instructions_fr JSONB;

-- Добавляем колонки для переводов советов (JSON массивы)
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS tips_pl JSONB;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS tips_sv JSONB;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS tips_cs JSONB;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS tips_sk JSONB;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS tips_fi JSONB;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS tips_it JSONB;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS tips_de JSONB;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS tips_fr JSONB;

-- Проверяем, что колонки добавлены
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'exercises' 
AND column_name LIKE '%_pl' OR column_name LIKE '%_sv' OR column_name LIKE '%_cs' 
OR column_name LIKE '%_sk' OR column_name LIKE '%_fi' OR column_name LIKE '%_it' 
OR column_name LIKE '%_de' OR column_name LIKE '%_fr'
ORDER BY column_name;








