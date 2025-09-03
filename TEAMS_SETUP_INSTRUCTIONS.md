# 🏒 Инструкция по настройке системы команд

## 📋 Что нужно сделать

Система команд полностью готова в коде, но нужно применить SQL изменения к базе данных Supabase.

## 🚀 Шаги для применения изменений

### 1. Откройте Supabase Dashboard
- Перейдите на https://supabase.com/dashboard
- Войдите в свой аккаунт
- Выберите проект `hockeystars-app`

### 2. Откройте SQL Editor
- В левом меню найдите "SQL Editor"
- Нажмите "New query" для создания нового запроса

### 3. Скопируйте и выполните SQL скрипт
Скопируйте содержимое файла `database/add_teams_support.sql` и вставьте в SQL Editor.

### 4. Выполните команды
Нажмите кнопку "Run" для выполнения всех SQL команд.

## 📄 Содержимое SQL файла

```sql
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
  joined_date DATE
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
    pt.joined_date
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
```

## ✅ Что будет создано

После выполнения SQL скрипта будут созданы:

1. **Таблица `teams`** - список всех команд
2. **Таблица `player_teams`** - связи игроков с командами
3. **Индексы** для быстрого поиска
4. **RLS политики** для безопасности
5. **Функции** для работы с командами
6. **Начальные данные** - 30+ хоккейных команд

## 🔍 Проверка после выполнения

После выполнения SQL скрипта запустите проверку:

```bash
node check_teams_status.js
```

Должны увидеть:
- ✅ Таблица teams существует
- ✅ Таблица player_teams существует  
- ✅ Функции работают
- 📊 Количество команд: ~30

## 🎯 Что можно будет делать после настройки

1. **Выбирать команды** при регистрации/редактировании профиля
2. **Искать команды** с автодополнением
3. **Создавать новые команды** если их нет в списке
4. **Выбирать несколько команд** (клуб + сборная + региональная)
5. **Назначать основную команду**
6. **Видеть команды** в профиле игрока

## 🚨 Важно

- Выполните SQL скрипт **один раз**
- После выполнения перезапустите приложение
- Все существующие данные игроков останутся без изменений 