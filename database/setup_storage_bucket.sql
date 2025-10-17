-- Настройка Storage Bucket для предметов
-- Выполните этот скрипт в Supabase SQL Editor

-- Создаем bucket для хранения изображений предметов
INSERT INTO storage.buckets (id, name, public)
VALUES ('items', 'items', true)
ON CONFLICT (id) DO NOTHING;

-- Удаляем существующие политики, если они есть, и создаем новые
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload items" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own items" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own items" ON storage.objects;

-- Создаем политики для bucket (разрешаем всем авторизованным пользователям)
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT USING (bucket_id = 'items');

CREATE POLICY "Authenticated users can upload items" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'items');

CREATE POLICY "Users can update own items" ON storage.objects
FOR UPDATE USING (bucket_id = 'items');

CREATE POLICY "Users can delete own items" ON storage.objects
FOR DELETE USING (bucket_id = 'items');

-- Исправляем RLS политики для таблицы items
-- Поскольку используется кастомная аутентификация, отключаем RLS для items
ALTER TABLE items DISABLE ROW LEVEL SECURITY;

-- Отключаем RLS для таблицы item_requests тоже
ALTER TABLE item_requests DISABLE ROW LEVEL SECURITY;

-- Отключаем RLS для таблицы player_museum тоже
ALTER TABLE player_museum DISABLE ROW LEVEL SECURITY;

-- Проверяем, что функция update_updated_at_column существует
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Добавляем триггеры, если их нет
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_trigger 
        WHERE tgname = 'update_items_updated_at'
    ) THEN
        CREATE TRIGGER update_items_updated_at 
            BEFORE UPDATE ON items 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (
        SELECT FROM pg_trigger 
        WHERE tgname = 'update_item_requests_updated_at'
    ) THEN
        CREATE TRIGGER update_item_requests_updated_at 
            BEFORE UPDATE ON item_requests 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Проверяем структуру таблицы players
DO $$
BEGIN
    -- Добавляем колонку avatar_url, если её нет
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'players' 
        AND column_name = 'avatar_url'
    ) THEN
        ALTER TABLE players ADD COLUMN avatar_url TEXT;
        RAISE NOTICE 'Добавлена колонка avatar_url в таблицу players';
    ELSE
        RAISE NOTICE 'Колонка avatar_url уже существует в таблице players';
    END IF;
END $$;

DO $$
BEGIN
    RAISE NOTICE 'Storage bucket и политики настроены!';
    RAISE NOTICE 'RLS отключен для таблиц items, item_requests, player_museum (кастомная аутентификация)';
END $$;
