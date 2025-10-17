-- Создание таблицы игроков
CREATE TABLE players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  position VARCHAR(100),
  team VARCHAR(255),
  age INTEGER,
  height INTEGER,
  weight INTEGER,
  avatar TEXT,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'user' CHECK (status IN ('user', 'admin')),
  birth_date DATE,
  hockey_start_date DATE,
  experience INTEGER,
  achievements TEXT,
  phone VARCHAR(20),
  city VARCHAR(100),
  goals INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  country VARCHAR(100),
  grip VARCHAR(10),
  games INTEGER DEFAULT 0,
  pull_ups INTEGER DEFAULT 0,
  push_ups INTEGER DEFAULT 0,
  plank_time INTEGER DEFAULT 0,
  sprint_100m DECIMAL(5,2) DEFAULT 0,
  long_jump INTEGER DEFAULT 0,
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

-- Политики для таблицы players (разрешаем все операции без аутентификации)
CREATE POLICY "Players are viewable by everyone" ON players
  FOR SELECT USING (true);

CREATE POLICY "Players can be inserted by anyone" ON players
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Players can be updated by anyone" ON players
  FOR UPDATE USING (true);

CREATE POLICY "Players can be deleted by anyone" ON players
  FOR DELETE USING (true);

-- Политики для таблицы messages
CREATE POLICY "Messages are viewable by everyone" ON messages
  FOR SELECT USING (true);

CREATE POLICY "Messages can be inserted by anyone" ON messages
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Messages can be updated by anyone" ON messages
  FOR UPDATE USING (true);

CREATE POLICY "Messages can be deleted by anyone" ON messages
  FOR DELETE USING (true);

-- Политики для таблицы friend_requests
CREATE POLICY "Friend requests are viewable by everyone" ON friend_requests
  FOR SELECT USING (true);

CREATE POLICY "Friend requests can be inserted by anyone" ON friend_requests
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Friend requests can be updated by anyone" ON friend_requests
  FOR UPDATE USING (true);

CREATE POLICY "Friend requests can be deleted by anyone" ON friend_requests
  FOR DELETE USING (true);

-- Политики для таблицы notifications
CREATE POLICY "Notifications are viewable by everyone" ON notifications
  FOR SELECT USING (true);

CREATE POLICY "Notifications can be inserted by anyone" ON notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Notifications can be updated by anyone" ON notifications
  FOR UPDATE USING (true);

CREATE POLICY "Notifications can be deleted by anyone" ON notifications
  FOR DELETE USING (true); 