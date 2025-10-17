# Инструкция по настройке системы рейтинга активности

## Шаг 1: Выполнение SQL скрипта в Supabase

1. Откройте **Supabase Dashboard**: https://supabase.com/dashboard
2. Выберите ваш проект **hockeystars**
3. Перейдите в раздел **SQL Editor** (в левом меню)
4. Нажмите **New query**
5. Скопируйте весь содержимый файла `database/setup_activity_rating_system.sql`
6. Вставьте его в редактор SQL
7. Нажмите **Run** (или `Cmd+Enter` / `Ctrl+Enter`)

## Шаг 2: Проверка создания таблиц

После выполнения скрипта вы должны увидеть в последней секции вывода список политик RLS.

Проверьте, что созданы:
- ✅ Таблица `activity_points` с полями: `id`, `user_id`, `points`, `last_activity_date`, `created_at`, `updated_at`
- ✅ Таблица `activity_log` с полями: `id`, `user_id`, `activity_type`, `points_earned`, `description`, `created_at`
- ✅ 7 политик RLS (4 для `activity_points`, 3 для `activity_log`)

## Шаг 3: Проверка политик RLS

В выводе SQL запроса вы должны увидеть следующие политики:

### Для activity_points:
1. **Users can view their own activity points** - пользователи видят свои очки
2. **Users can insert their own activity points** - пользователи могут создавать свои очки
3. **Users can update their own activity points** - пользователи могут обновлять свои очки
4. **Admins can view all activity points** - администраторы видят все очки

### Для activity_log:
1. **Users can view their own activity logs** - пользователи видят свои логи
2. **Users can insert their own activity logs** - пользователи могут создавать свои логи
3. **Admins can view all activity logs** - администраторы видят все логи

## Шаг 4: Переключение приложения на базу данных

После успешного выполнения SQL скрипта, сообщите мне, и я переключу приложение с локальной версии на версию с базой данных.

## Возможные проблемы и решения

### Проблема 1: "relation already exists"
**Решение:** Это нормально, таблицы уже были созданы ранее. Скрипт их не пересоздаст, а только добавит недостающие политики.

### Проблема 2: "policy already exists"
**Решение:** Скрипт удаляет старые политики перед созданием новых. Если видите эту ошибку, значит политики уже были удалены.

### Проблема 3: "column does not exist"
**Решение:** Убедитесь, что таблица `profiles` имеет поле `status` со значением `'admin'` для администраторов.

## Тестирование

После настройки системы, протестируйте:
1. ✅ Войдите в приложение - должно начислиться +1 очко
2. ✅ Откройте профиль - должна отображаться красная звездочка с количеством очков
3. ✅ Откройте упражнение - должно начислиться +1 очко
4. ✅ Обновите профиль - должно начислиться +1 очко
5. ✅ Добавьте друга - должно начислиться +1 очко

## Структура базы данных

```sql
activity_points
├── id (BIGSERIAL PRIMARY KEY)
├── user_id (TEXT, FOREIGN KEY -> auth.users.id)
├── points (INTEGER, DEFAULT 0)
├── last_activity_date (TIMESTAMPTZ)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)

activity_log
├── id (BIGSERIAL PRIMARY KEY)
├── user_id (TEXT, FOREIGN KEY -> auth.users.id)
├── activity_type (TEXT)
├── points_earned (INTEGER, DEFAULT 1)
├── description (TEXT)
└── created_at (TIMESTAMPTZ)
```

## Типы активности

- `login` - Вход в приложение (+1 очко)
- `exercise_complete` - Выполнение упражнения (+1 очко)
- `exercise_view` - Просмотр упражнения (+1 очко)
- `profile_update` - Обновление профиля (+1 очко)
- `friend_add` - Добавление в друзья (+1 очко)
- `message_send` - Отправка сообщения (+1 очко)
- `photo_upload` - Загрузка фото (+1 очко)
- `video_upload` - Загрузка видео (+1 очко)
- `profile_fill` - Заполнение профиля (+1 очко)

## Дополнительно

Если после настройки базы данных возникнут ошибки, отправьте мне:
1. Сообщение об ошибке из консоли
2. Скриншот политик RLS из Supabase Dashboard (Table Editor -> activity_points -> Policies)



