-- Исправление существующих таблиц и создание недостающих
-- Выполните этот скрипт в Supabase SQL Editor

-- Сначала проверяем, какие таблицы существуют
DO $$
DECLARE
    table_exists BOOLEAN;
BEGIN
    -- Проверяем таблицу items
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'items'
    ) INTO table_exists;
    
    IF table_exists THEN
        RAISE NOTICE 'Таблица items уже существует';
        
        -- Проверяем и добавляем недостающие колонки
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'items' 
            AND column_name = 'updated_at'
        ) THEN
            ALTER TABLE items ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
            RAISE NOTICE 'Добавлена колонка updated_at в таблицу items';
        END IF;
        
        -- Проверяем и добавляем триггер для updated_at
        IF NOT EXISTS (
            SELECT FROM pg_trigger 
            WHERE tgname = 'update_items_updated_at'
        ) THEN
            CREATE TRIGGER update_items_updated_at 
                BEFORE UPDATE ON items 
                FOR EACH ROW 
                EXECUTE FUNCTION update_updated_at_column();
            RAISE NOTICE 'Добавлен триггер update_items_updated_at';
        END IF;
        
    ELSE
        -- Создаем таблицу items
        CREATE TABLE items (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            owner_id UUID REFERENCES players(id) ON DELETE CASCADE,
            item_type VARCHAR(50) NOT NULL CHECK (item_type IN ('autograph', 'stick', 'puck', 'jersey')),
            name VARCHAR(255) NOT NULL,
            description TEXT,
            image_url TEXT,
            is_available BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        RAISE NOTICE 'Создана таблица items';
        
        -- Создаем триггер
        CREATE TRIGGER update_items_updated_at 
            BEFORE UPDATE ON items 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- Проверяем таблицу item_requests
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'item_requests'
    ) INTO table_exists;
    
    IF table_exists THEN
        RAISE NOTICE 'Таблица item_requests уже существует';
        
        -- Проверяем и добавляем недостающие колонки
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'item_requests' 
            AND column_name = 'updated_at'
        ) THEN
            ALTER TABLE item_requests ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
            RAISE NOTICE 'Добавлена колонка updated_at в таблицу item_requests';
        END IF;
        
        -- Проверяем и добавляем триггер
        IF NOT EXISTS (
            SELECT FROM pg_trigger 
            WHERE tgname = 'update_item_requests_updated_at'
        ) THEN
            CREATE TRIGGER update_item_requests_updated_at 
                BEFORE UPDATE ON item_requests 
                FOR EACH ROW 
                EXECUTE FUNCTION update_updated_at_column();
            RAISE NOTICE 'Добавлен триггер update_item_requests_updated_at';
        END IF;
        
    ELSE
        -- Создаем таблицу item_requests
        CREATE TABLE item_requests (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            requester_id UUID REFERENCES players(id) ON DELETE CASCADE,
            owner_id UUID REFERENCES players(id) ON DELETE CASCADE,
            item_type VARCHAR(50) NOT NULL CHECK (item_type IN ('autograph', 'stick', 'puck', 'jersey')),
            message TEXT,
            status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        RAISE NOTICE 'Создана таблица item_requests';
        
        -- Создаем триггер
        CREATE TRIGGER update_item_requests_updated_at 
            BEFORE UPDATE ON item_requests 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- Проверяем таблицу player_museum
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'player_museum'
    ) INTO table_exists;
    
    IF table_exists THEN
        RAISE NOTICE 'Таблица player_museum уже существует';
    ELSE
        -- Создаем таблицу player_museum
        CREATE TABLE player_museum (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            player_id UUID REFERENCES players(id) ON DELETE CASCADE,
            item_id UUID REFERENCES items(id) ON DELETE CASCADE,
            received_from UUID REFERENCES players(id) ON DELETE CASCADE,
            received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(player_id, item_id)
        );
        RAISE NOTICE 'Создана таблица player_museum';
    END IF;
    
END $$;

-- Создаем недостающие индексы (если их нет)
CREATE INDEX IF NOT EXISTS idx_items_owner ON items(owner_id);
CREATE INDEX IF NOT EXISTS idx_items_type ON items(item_type);
CREATE INDEX IF NOT EXISTS idx_items_available ON items(is_available);
CREATE INDEX IF NOT EXISTS idx_item_requests_requester ON item_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_item_requests_owner ON item_requests(owner_id);
CREATE INDEX IF NOT EXISTS idx_item_requests_status ON item_requests(status);
CREATE INDEX IF NOT EXISTS idx_player_museum_player ON player_museum(player_id);
CREATE INDEX IF NOT EXISTS idx_player_museum_item ON player_museum(item_id);

-- Включаем RLS для всех таблиц
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_museum ENABLE ROW LEVEL SECURITY;

-- Создаем политики для таблицы items (если их нет)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'items' 
        AND policyname = 'Items are viewable by everyone'
    ) THEN
        CREATE POLICY "Items are viewable by everyone" ON items
            FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'items' 
        AND policyname = 'Players can insert own items'
    ) THEN
        CREATE POLICY "Players can insert own items" ON items
            FOR INSERT WITH CHECK (auth.uid()::text = owner_id::text);
    END IF;
    
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'items' 
        AND policyname = 'Players can update own items'
    ) THEN
        CREATE POLICY "Players can update own items" ON items
            FOR UPDATE USING (auth.uid()::text = owner_id::text);
    END IF;
    
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'items' 
        AND policyname = 'Players can delete own items'
    ) THEN
        CREATE POLICY "Players can delete own items" ON items
            FOR DELETE USING (auth.uid()::text = owner_id::text);
    END IF;
END $$;

-- Создаем политики для таблицы item_requests (если их нет)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'item_requests' 
        AND policyname = 'Item requests are viewable by participants'
    ) THEN
        CREATE POLICY "Item requests are viewable by participants" ON item_requests
            FOR SELECT USING (
                auth.uid()::text = requester_id::text OR 
                auth.uid()::text = owner_id::text
            );
    END IF;
    
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'item_requests' 
        AND policyname = 'Players can insert item requests'
    ) THEN
        CREATE POLICY "Players can insert item requests" ON item_requests
            FOR INSERT WITH CHECK (auth.uid()::text = requester_id::text);
    END IF;
    
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'item_requests' 
        AND policyname = 'Item owners can update requests'
    ) THEN
        CREATE POLICY "Item owners can update requests" ON item_requests
            FOR UPDATE USING (auth.uid()::text = owner_id::text);
    END IF;
END $$;

-- Создаем политики для таблицы player_museum (если их нет)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'player_museum' 
        AND policyname = 'Museum items are viewable by everyone'
    ) THEN
        CREATE POLICY "Museum items are viewable by everyone" ON player_museum
            FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'player_museum' 
        AND policyname = 'Players can insert museum items'
    ) THEN
        CREATE POLICY "Players can insert museum items" ON player_museum
            FOR INSERT WITH CHECK (auth.uid()::text = player_id::text);
    END IF;
END $$;

-- Добавляем комментарии к таблицам
COMMENT ON TABLE items IS 'Коллекционные предметы звезд (автографы, клюшки, шайбы, джерси)';
COMMENT ON TABLE item_requests IS 'Запросы игроков на получение предметов от звезд';
COMMENT ON TABLE player_museum IS 'Музей игрока - полученные предметы от звезд';

-- Выводим сообщение об успешном завершении
DO $$
BEGIN
    RAISE NOTICE 'Все таблицы и политики настроены!';
END $$;
