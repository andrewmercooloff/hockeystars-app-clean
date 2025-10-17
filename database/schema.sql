-- Создание таблицы игроков
CREATE TABLE players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  position VARCHAR(100),
  team VARCHAR(255),
  age INTEGER,
  height VARCHAR(50),
  weight VARCHAR(50),
  avatar TEXT,
  email VARCHAR(255) UNIQUE,
  password VARCHAR(255),
  status VARCHAR(50) DEFAULT 'user',
  birth_date DATE,
  hockey_start_date DATE,
  experience TEXT,
  achievements TEXT,
  phone VARCHAR(50),
  city VARCHAR(100),
  goals VARCHAR(10),
  assists VARCHAR(10),
  country VARCHAR(100),
  grip VARCHAR(50),
  games VARCHAR(10),
  pull_ups VARCHAR(10),
  push_ups VARCHAR(10),
  plank_time VARCHAR(10),
  sprint_100m VARCHAR(10),
  long_jump VARCHAR(10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание таблицы сообщений
CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES players(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES players(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание таблицы запросов дружбы
CREATE TABLE friend_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_id UUID REFERENCES players(id) ON DELETE CASCADE,
  to_id UUID REFERENCES players(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(from_id, to_id)
);

-- Создание таблицы уведомлений
CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES players(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание индексов для улучшения производительности
CREATE INDEX idx_players_email ON players(email);
CREATE INDEX idx_players_status ON players(status);
CREATE INDEX idx_messages_sender_receiver ON messages(sender_id, receiver_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_friend_requests_to_status ON friend_requests(to_id, status);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read);

-- Создание триггера для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_players_updated_at 
  BEFORE UPDATE ON players 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Включение Row Level Security (RLS)
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Политики для таблицы players (все пользователи могут читать, но редактировать только свои данные)
CREATE POLICY "Players are viewable by everyone" ON players
  FOR SELECT USING (true);

CREATE POLICY "Players can update own data" ON players
  FOR UPDATE USING (auth.uid()::text = id::text);

CREATE POLICY "Players can insert own data" ON players
  FOR INSERT WITH CHECK (auth.uid()::text = id::text);

-- Политики для таблицы messages
CREATE POLICY "Messages are viewable by participants" ON messages
  FOR SELECT USING (auth.uid()::text = sender_id::text OR auth.uid()::text = receiver_id::text);

CREATE POLICY "Users can insert messages" ON messages
  FOR INSERT WITH CHECK (auth.uid()::text = sender_id::text);

-- Политики для таблицы friend_requests
CREATE POLICY "Friend requests are viewable by participants" ON friend_requests
  FOR SELECT USING (auth.uid()::text = from_id::text OR auth.uid()::text = to_id::text);

CREATE POLICY "Users can insert friend requests" ON friend_requests
  FOR INSERT WITH CHECK (auth.uid()::text = from_id::text);

CREATE POLICY "Users can update friend requests" ON friend_requests
  FOR UPDATE USING (auth.uid()::text = to_id::text);

-- Политики для таблицы notifications
CREATE POLICY "Notifications are viewable by owner" ON notifications
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Notifications can be inserted" ON notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid()::text = user_id::text); 