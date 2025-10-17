-- Добавление полей для социальных сетей в таблицу players
-- Этот скрипт добавляет поля для Instagram, TikTok, VK и веб-сайта

-- Добавляем поля для социальных сетей
ALTER TABLE players 
  ADD COLUMN IF NOT EXISTS instagram TEXT,
  ADD COLUMN IF NOT EXISTS tiktok TEXT,
  ADD COLUMN IF NOT EXISTS vk TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT;

-- Создаем индексы для быстрого поиска по социальным сетям
CREATE INDEX IF NOT EXISTS idx_players_instagram ON players(instagram) WHERE instagram IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_players_tiktok ON players(tiktok) WHERE tiktok IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_players_vk ON players(vk) WHERE vk IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_players_website ON players(website) WHERE website IS NOT NULL;

-- Проверяем результат
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'players' 
  AND column_name IN ('instagram', 'tiktok', 'vk', 'website')
ORDER BY column_name;
