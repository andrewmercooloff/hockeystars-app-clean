-- Добавление поддержки команд в базу данных

-- Создание таблицы команд
CREATE TABLE teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  type VARCHAR(50) DEFAULT 'club', -- 'club', 'national', 'regional', 'school'
  country VARCHAR(100),
  city VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание таблицы связи игроков с командами (многие ко многим)
CREATE TABLE player_teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT FALSE, -- основная команда игрока
  joined_date DATE,
  start_year INTEGER, -- год начала в команде
  end_year INTEGER, -- год окончания в команде (NULL для текущих команд)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(player_id, team_id)
);

-- Добавление индексов для улучшения производительности
CREATE INDEX idx_teams_name ON teams(name);
CREATE INDEX idx_teams_type ON teams(type);
CREATE INDEX idx_player_teams_player ON player_teams(player_id);
CREATE INDEX idx_player_teams_team ON player_teams(team_id);
CREATE INDEX idx_player_teams_primary ON player_teams(player_id, is_primary);

-- Создание триггера для автоматического обновления updated_at для команд
CREATE TRIGGER update_teams_updated_at 
  BEFORE UPDATE ON teams 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Включение Row Level Security для новых таблиц
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_teams ENABLE ROW LEVEL SECURITY;

-- Политики для таблицы teams (все пользователи могут читать, администраторы могут редактировать)
CREATE POLICY "Teams are viewable by everyone" ON teams
  FOR SELECT USING (true);

CREATE POLICY "Teams can be inserted by authenticated users" ON teams
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Политики для таблицы player_teams
CREATE POLICY "Player teams are viewable by everyone" ON player_teams
  FOR SELECT USING (true);

CREATE POLICY "Players can manage own team associations" ON player_teams
  FOR ALL USING (auth.uid()::text = player_id::text);

-- Добавление популярных команд
INSERT INTO teams (name, type, country, city) VALUES
-- Клубы Беларуси
('ШРС', 'club', 'Беларусь', NULL),
('Динамо', 'club', 'Беларусь', NULL),
('Юность', 'club', 'Беларусь', NULL),
('Пираньи', 'club', 'Беларусь', NULL),
('Динамо-Молодечно', 'club', 'Беларусь', 'Молодечно'),
('Барановичи', 'club', 'Беларусь', 'Барановичи'),
('Шахтер', 'club', 'Беларусь', NULL),
('Неман', 'club', 'Беларусь', NULL),
('Брест', 'club', 'Беларусь', 'Брест'),
('Лида', 'club', 'Беларусь', 'Лида'),
('Пинск', 'club', 'Беларусь', 'Пинск'),
('Ивацевичи', 'club', 'Беларусь', 'Ивацевичи'),
('Береза', 'club', 'Беларусь', 'Береза'),
('Кобрин', 'club', 'Беларусь', 'Кобрин'),
('Химик', 'club', 'Беларусь', NULL),
('Жлобин', 'club', 'Беларусь', 'Жлобин'),
('Могилев', 'club', 'Беларусь', 'Могилев'),
('Локомотив', 'club', 'Беларусь', NULL),
('Бобруйск', 'club', 'Беларусь', 'Бобруйск'),
('Гомель', 'club', 'Беларусь', 'Гомель'),
('Витебск', 'club', 'Беларусь', 'Витебск'),
('Лунинец', 'club', 'Беларусь', 'Лунинец'),

-- Сборные Беларуси
('Сборная РБ', 'national', 'Беларусь', NULL),
('Сборная Минска', 'regional', 'Беларусь', 'Минск'),
('Сборная Минской области', 'regional', 'Беларусь', 'Минск'),
('Сборная Гомельской области', 'regional', 'Беларусь', 'Гомель'),
('Сборная Могилевской области', 'regional', 'Беларусь', 'Могилев'),
('Сборная Брестской области', 'regional', 'Беларусь', 'Брест'),
('Сборная Гродненской области', 'regional', 'Беларусь', 'Гродно'),

-- Популярные российские хоккейные клубы
('ЦСКА Москва', 'club', 'Россия', 'Москва'),
('Динамо Москва', 'club', 'Россия', 'Москва'),
('Спартак Москва', 'club', 'Россия', 'Москва'),
('Локомотив Ярославль', 'club', 'Россия', 'Ярославль'),
('Ак Барс Казань', 'club', 'Россия', 'Казань'),
('Трактор Челябинск', 'club', 'Россия', 'Челябинск'),
('Салават Юлаев', 'club', 'Россия', 'Уфа'),
('Металлург Магнитогорск', 'club', 'Россия', 'Магнитогорск'),
('Северсталь', 'club', 'Россия', 'Череповец'),
('Торпедо Нижний Новгород', 'club', 'Россия', 'Нижний Новгород');

-- Функция для получения команд игрока
CREATE OR REPLACE FUNCTION get_player_teams(player_uuid UUID)
RETURNS TABLE (
  team_id UUID,
  team_name VARCHAR(255),
  team_type VARCHAR(50),
  team_country VARCHAR(100),
  team_city VARCHAR(100),
  is_primary BOOLEAN,
  joined_date DATE,
  start_year INTEGER,
  end_year INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.name,
    t.type,
    t.country,
    t.city,
    pt.is_primary,
    pt.joined_date,
    pt.start_year,
    pt.end_year
  FROM player_teams pt
  JOIN teams t ON pt.team_id = t.id
  WHERE pt.player_id = player_uuid
  ORDER BY pt.is_primary DESC, t.name;
END;
$$ LANGUAGE plpgsql;

-- Функция для поиска команд по названию
CREATE OR REPLACE FUNCTION search_teams(search_term VARCHAR(255))
RETURNS TABLE (
  id UUID,
  name VARCHAR(255),
  type VARCHAR(50),
  country VARCHAR(100),
  city VARCHAR(100)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.name,
    t.type,
    t.country,
    t.city
  FROM teams t
  WHERE LOWER(t.name) LIKE LOWER('%' || search_term || '%')
  ORDER BY 
    CASE WHEN LOWER(t.name) = LOWER(search_term) THEN 1
         WHEN LOWER(t.name) LIKE LOWER(search_term || '%') THEN 2
         ELSE 3
    END,
    t.name
  LIMIT 10;
END;
$$ LANGUAGE plpgsql; 