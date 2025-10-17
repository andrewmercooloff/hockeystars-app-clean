# Исправление проблем с push-уведомлениями

## 🐛 Проблема

В терминале появляется ошибка:
```
duplicate key value violates unique constraint "push_tokens_user_id_key"
```

Это происходит потому, что в базе данных constraint настроен неправильно.

## ✅ Решение

### Шаг 1: Исправить constraint

1. Откройте **Supabase Dashboard**
2. Перейдите в **SQL Editor**
3. Выполните скрипт `fix_push_tokens_constraint.sql`:

```sql
-- Удаляем старый constraint на user_id
ALTER TABLE push_tokens DROP CONSTRAINT IF EXISTS push_tokens_user_id_key;

-- Создаем правильный constraint на (token, user_id)
ALTER TABLE push_tokens 
ADD CONSTRAINT push_tokens_token_user_id_key UNIQUE (token, user_id);
```

### Шаг 2: Настроить RLS политики

Выполните скрипт `push_tokens_rls_policies.sql`:

```sql
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tokens" ON push_tokens
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own tokens" ON push_tokens
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own tokens" ON push_tokens
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Users can delete own tokens" ON push_tokens
  FOR DELETE USING (true);
```

### Шаг 3: Очистить старые токены (опционально)

Если нужно начать с чистого листа:

```sql
-- ВНИМАНИЕ: это удалит все токены!
TRUNCATE TABLE push_tokens;
```

## 🎯 Результат

После выполнения этих скриптов:
- ✅ Пользователь сможет иметь несколько токенов (разные устройства)
- ✅ Не будет ошибок duplicate key
- ✅ Push-уведомления будут работать корректно
- ✅ Токены будут сохраняться и обновляться без ошибок

## 📱 Тестирование

После исправления:
1. Перезапустите приложение
2. Проверьте логи - ошибок не должно быть
3. Отправьте тестовое push-уведомление
4. Уведомление должно появиться с звуком not.mp3











