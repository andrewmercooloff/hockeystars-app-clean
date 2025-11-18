# Добавление колонки is_hidden в таблицу players

## 🐛 Проблема

При попытке скрыть профиль пользователя возникает ошибка:
```
Could not find the 'is_hidden' column of 'players' in the schema cache
```

Это происходит потому, что колонка `is_hidden` не существует в таблице `players`.

## ✅ Решение

### Шаг 1: Добавить колонку в базу данных

1. Откройте **Supabase Dashboard**
2. Перейдите в **SQL Editor**
3. Выполните скрипт `add_is_hidden_column.sql`:

```sql
-- Добавление колонки is_hidden в таблицу players
ALTER TABLE players 
ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE;

-- Создаем индекс для быстрого поиска скрытых профилей
CREATE INDEX IF NOT EXISTS idx_players_is_hidden ON players(is_hidden);

-- Добавляем комментарий
COMMENT ON COLUMN players.is_hidden IS 'Флаг скрытия профиля администратором. Скрытые профили не видны другим пользователям.';
```

### Шаг 2: Проверка

После выполнения скрипта проверьте, что колонка добавлена:

```sql
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'players' AND column_name = 'is_hidden';
```

Должен вернуться результат:
- `column_name`: `is_hidden`
- `data_type`: `boolean`
- `column_default`: `false`

## 🎯 Результат

После выполнения скрипта:
- ✅ Колонка `is_hidden` будет добавлена в таблицу `players`
- ✅ По умолчанию все профили будут видимыми (`is_hidden = false`)
- ✅ Администраторы смогут скрывать и показывать профили пользователей
- ✅ Скрытые профили не будут отображаться в списках и поиске



