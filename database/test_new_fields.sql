-- Тестовый скрипт для проверки новых полей
-- Выполните этот скрипт в SQL Editor в Supabase Dashboard

-- Проверяем структуру таблицы players
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'players' AND column_name IN ('past_teams', 'achievements', 'photos')
ORDER BY column_name;

-- Проверяем, что поля существуют и имеют правильный тип
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'players' AND column_name = 'past_teams' AND data_type = 'jsonb'
    ) THEN '✅ past_teams - OK'
    ELSE '❌ past_teams - НЕ НАЙДЕНО или НЕПРАВИЛЬНЫЙ ТИП'
  END as past_teams_status,
  
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'players' AND column_name = 'achievements' AND data_type = 'jsonb'
    ) THEN '✅ achievements - OK'
    ELSE '❌ achievements - НЕ НАЙДЕНО или НЕПРАВИЛЬНЫЙ ТИП'
  END as achievements_status,
  
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'players' AND column_name = 'photos' AND data_type = 'jsonb'
    ) THEN '✅ photos - OK'
    ELSE '❌ photos - НЕ НАЙДЕНО или НЕПРАВИЛЬНЫЙ ТИП'
  END as photos_status;

-- Проверяем индексы
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'players' AND indexname LIKE '%past_teams%' OR indexname LIKE '%achievements%' OR indexname LIKE '%photos%'; 