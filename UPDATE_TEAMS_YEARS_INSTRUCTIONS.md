# Инструкция по обновлению системы команд для поддержки годов

## Проблема
Годы команд не сохранялись в базе данных, что приводило к неправильному отображению:
- Текущие команды показывали "настоящее время" без года начала
- Прошлые команды показывали неправильные годы (например, 2025 вместо 2014-2018)

## Решение
Добавлены поля `start_year` и `end_year` в таблицу `player_teams` для хранения годов команд.

## Шаги для применения изменений

### 1. Обновление базы данных
Выполните SQL-скрипт `database/update_player_teams_years.sql` в вашей базе данных Supabase:

```sql
-- Добавление полей для годов в таблицу player_teams
ALTER TABLE player_teams 
ADD COLUMN IF NOT EXISTS start_year INTEGER,
ADD COLUMN IF NOT EXISTS end_year INTEGER;

-- Обновление функции get_player_teams
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

-- Установка временных значений для существующих записей
UPDATE player_teams 
SET start_year = EXTRACT(YEAR FROM CURRENT_DATE)
WHERE is_primary = true AND start_year IS NULL;

UPDATE player_teams 
SET 
  start_year = EXTRACT(YEAR FROM CURRENT_DATE) - 1,
  end_year = EXTRACT(YEAR FROM CURRENT_DATE)
WHERE is_primary = false AND start_year IS NULL;

UPDATE player_teams 
SET end_year = NULL
WHERE is_primary = true;
```

### 2. Перезапуск приложения
После обновления базы данных перезапустите приложение, чтобы изменения в коде вступили в силу.

### 3. Проверка работы
1. Откройте профиль любого игрока
2. Перейдите в режим редактирования
3. Добавьте текущую команду с годом начала (например, 2018)
4. Добавьте прошлую команду с годами (например, 2014-2018)
5. Сохраните профиль
6. Проверьте, что годы отображаются правильно:
   - Текущая команда: "(2018 - настоящее время)"
   - Прошлая команда: "2014 - 2018"

## Что изменилось в коде

### 1. База данных
- Добавлены поля `start_year` и `end_year` в таблицу `player_teams`
- Обновлена функция `get_player_teams` для возврата новых полей

### 2. TypeScript интерфейсы
- Обновлен интерфейс `PlayerTeam` с полями `startYear` и `endYear`

### 3. Функции в utils/playerStorage.ts
- `addPlayerTeam`: теперь принимает и сохраняет годы
- `getPlayerTeams`: теперь возвращает годы из базы данных
- `convertPlayerTeamToPastTeam`: теперь использует сохраненные годы
- `syncPlayerTeams`: теперь передает годы при сохранении

### 4. Компоненты
- `CurrentTeamsSection`: годы обрабатываются правильно
- `PastTeamsSection`: годы обрабатываются правильно

## Важные замечания

1. **Существующие команды**: После выполнения SQL-скрипта все существующие команды получат временные значения годов. Пользователям нужно будет отредактировать свои команды и установить правильные годы.

2. **Обратная совместимость**: Код обратно совместим - если годы не установлены, используются значения по умолчанию.

3. **Валидация**: Добавлена валидация годов в компонентах (год начала должен быть от 1900 до текущего года, год окончания должен быть после года начала).

## Тестирование

После применения изменений протестируйте следующие сценарии:

1. ✅ Добавление текущей команды с годом начала
2. ✅ Добавление прошлой команды с годами начала и окончания
3. ✅ Редактирование существующих команд
4. ✅ Сохранение и загрузка команд с правильными годами
5. ✅ Отображение годов в профиле (режим просмотра)
6. ✅ Отображение годов в режиме редактирования 