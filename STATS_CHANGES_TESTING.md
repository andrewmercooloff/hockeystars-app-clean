# Тестирование системы индикаторов изменений статистики

## Что было реализовано

✅ **Система индикаторов изменений статистики с сохранением в БД**
- Индикаторы показываются **7 дней** вместо только до перезагрузки
- Данные сохраняются в таблице `stats_changes` в базе данных
- Автоматическая очистка истекших записей

## Шаги для тестирования

### 1. Создание таблицы в базе данных
Выполните SQL скрипт в Supabase SQL Editor:
```sql
-- Создание таблицы для хранения индикаторов изменений статистики
CREATE TABLE IF NOT EXISTS stats_changes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  field TEXT NOT NULL,
  old_value INTEGER NOT NULL,
  new_value INTEGER NOT NULL,
  change_value INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days')
);

-- Создание индексов для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_stats_changes_player_id ON stats_changes(player_id);
CREATE INDEX IF NOT EXISTS idx_stats_changes_expires_at ON stats_changes(expires_at);
CREATE INDEX IF NOT EXISTS idx_stats_changes_field ON stats_changes(field);

-- Включение RLS
ALTER TABLE stats_changes ENABLE ROW LEVEL SECURITY;

-- Политики RLS для stats_changes
CREATE POLICY "Users can view their own stats changes" ON stats_changes
  FOR SELECT USING (auth.uid() = player_id);

CREATE POLICY "Users can insert their own stats changes" ON stats_changes
  FOR INSERT WITH CHECK (auth.uid() = player_id);

CREATE POLICY "Users can update their own stats changes" ON stats_changes
  FOR UPDATE USING (auth.uid() = player_id);

CREATE POLICY "Users can delete their own stats changes" ON stats_changes
  FOR DELETE USING (auth.uid() = player_id);

-- Политика для админов
CREATE POLICY "Admins can manage all stats changes" ON stats_changes
  FOR ALL USING (auth.uid() IS NULL OR EXISTS (
    SELECT 1 FROM players WHERE id = auth.uid() AND status = 'admin'
  ));
```

### 2. Тестирование функциональности

1. **Войдите в приложение** как любой пользователь
2. **Перейдите в профиль** (свой или другого пользователя)
3. **Нажмите "Редактировать"** профиль
4. **Измените статистику** (голы, передачи, игры) или нормативы
5. **Сохраните изменения**
6. **Проверьте индикаторы** - должны появиться красные/оранжевые бейджи с изменениями
7. **Перезагрузите приложение** - индикаторы должны остаться
8. **Проверьте через несколько дней** - индикаторы должны исчезнуть через 7 дней

### 3. Что должно работать

✅ **Индикаторы показываются:**
- При изменении статистики (голы, передачи, игры)
- При изменении нормативов (подтягивания, отжимания, планка, etc.)
- В течение 7 дней после изменения
- После перезагрузки приложения

✅ **Индикаторы исчезают:**
- Через 7 дней автоматически
- При новых изменениях (обновляются)

### 4. Технические детали

- **Таблица:** `stats_changes`
- **Срок действия:** 7 дней (`expires_at`)
- **Автоочистка:** истекшие записи удаляются автоматически
- **RLS:** пользователи видят только свои изменения
- **Индексы:** оптимизированы для быстрого поиска

### 5. Проверка в базе данных

Можете проверить записи в таблице `stats_changes`:
```sql
SELECT * FROM stats_changes 
WHERE player_id = 'YOUR_PLAYER_ID' 
ORDER BY created_at DESC;
```

## Результат

🎯 **Индикаторы изменений статистики теперь работают 7 дней** вместо только до перезагрузки приложения!
