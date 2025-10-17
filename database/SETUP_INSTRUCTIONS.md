# Инструкция по настройке таблицы push_tokens в Supabase

## Шаги для создания таблицы:

1. Откройте Supabase Dashboard: https://supabase.com/dashboard
2. Выберите ваш проект
3. Перейдите в раздел **SQL Editor** (слева в меню)
4. Нажмите **New query**
5. Скопируйте содержимое файла `setup_push_tokens_table.sql` и вставьте в редактор
6. Нажмите **Run** или **Ctrl+Enter**

## Альтернативный способ (через Table Editor):

1. Откройте Supabase Dashboard
2. Перейдите в **Table Editor**
3. Нажмите **New table**
4. Создайте таблицу с именем `push_tokens` со следующими колонками:
   - `id` - int8 (PRIMARY KEY, AUTO INCREMENT)
   - `token` - text (NOT NULL)
   - `user_id` - text (NOT NULL)
   - `device_id` - text (NOT NULL)
   - `platform` - text (NOT NULL)
   - `created_at` - timestamptz (DEFAULT NOW())
   - `updated_at` - timestamptz (DEFAULT NOW())
5. Добавьте UNIQUE constraint на комбинацию `(token, user_id)`

## Проверка:

После выполнения SQL скрипта проверьте, что таблица создана:

```sql
SELECT * FROM push_tokens LIMIT 1;
```

Если запрос выполнился без ошибок, таблица создана успешно!












