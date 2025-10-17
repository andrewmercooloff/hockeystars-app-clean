-- Добавление системы предметов и музея в базу данных

-- Создание таблицы предметов (коллекционные вещи звезд)
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

-- Создание таблицы запросов на предметы
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

-- Создание таблицы музея игрока (полученные предметы)
CREATE TABLE player_museum (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  received_from UUID REFERENCES players(id) ON DELETE CASCADE,
  received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(player_id, item_id)
);

-- Добавление индексов для улучшения производительности
CREATE INDEX idx_items_owner ON items(owner_id);
CREATE INDEX idx_items_type ON items(item_type);
CREATE INDEX idx_items_available ON items(is_available);
CREATE INDEX idx_item_requests_requester ON item_requests(requester_id);
CREATE INDEX idx_item_requests_owner ON item_requests(owner_id);
CREATE INDEX idx_item_requests_status ON item_requests(status);
CREATE INDEX idx_player_museum_player ON player_museum(player_id);
CREATE INDEX idx_player_museum_item ON player_museum(item_id);

-- Создание триггера для автоматического обновления updated_at для предметов
CREATE TRIGGER update_items_updated_at 
  BEFORE UPDATE ON items 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Создание триггера для автоматического обновления updated_at для запросов
CREATE TRIGGER update_item_requests_updated_at 
  BEFORE UPDATE ON item_requests 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Включение Row Level Security для новых таблиц
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_museum ENABLE ROW LEVEL SECURITY;

-- Политики для таблицы items
CREATE POLICY "Items are viewable by everyone" ON items
  FOR SELECT USING (true);

CREATE POLICY "Players can insert own items" ON items
  FOR INSERT WITH CHECK (auth.uid()::text = owner_id::text);

CREATE POLICY "Players can update own items" ON items
  FOR UPDATE USING (auth.uid()::text = owner_id::text);

CREATE POLICY "Players can delete own items" ON items
  FOR DELETE USING (auth.uid()::text = owner_id::text);

-- Политики для таблицы item_requests
CREATE POLICY "Item requests are viewable by participants" ON item_requests
  FOR SELECT USING (
    auth.uid()::text = requester_id::text OR 
    auth.uid()::text = owner_id::text
  );

CREATE POLICY "Players can insert item requests" ON item_requests
  FOR INSERT WITH CHECK (auth.uid()::text = requester_id::text);

CREATE POLICY "Item owners can update requests" ON item_requests
  FOR UPDATE USING (auth.uid()::text = owner_id::text);

-- Политики для таблицы player_museum
CREATE POLICY "Museum items are viewable by everyone" ON player_museum
  FOR SELECT USING (true);

CREATE POLICY "Players can insert museum items" ON player_museum
  FOR INSERT WITH CHECK (auth.uid()::text = player_id::text);

-- Добавление комментариев к таблицам
COMMENT ON TABLE items IS 'Коллекционные предметы звезд (автографы, клюшки, шайбы, джерси)';
COMMENT ON TABLE item_requests IS 'Запросы игроков на получение предметов от звезд';
COMMENT ON TABLE player_museum IS 'Музей игрока - полученные предметы от звезд';
