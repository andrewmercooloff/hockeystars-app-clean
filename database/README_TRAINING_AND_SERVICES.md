# Добавление полей для индивидуальных тренировок и услуг заточки коньков

## Выполните этот SQL скрипт в Supabase

1. Откройте Supabase Dashboard
2. Перейдите в раздел "SQL Editor"
3. Выполните скрипт из файла `add_training_and_services_fields.sql`

## Что добавляется:

### 1. Поле `individual_training` (TEXT[])
- Для тренеров
- Хранит массив типов индивидуальных тренировок
- По умолчанию: пустой массив `{}`

### 2. Поле `skate_services` (TEXT[])
- Для заточки коньков
- Хранит массив услуг
- По умолчанию: пустой массив `{}`

### 3. Индексы
- GIN индексы для быстрого поиска по массивам

## После выполнения SQL:

1. Перезапустите приложение
2. Проверьте, что новые поля сохраняются и загружаются
3. Проверьте, что значения не пропадают при перезагрузке

## Проверка:

Выполните этот запрос для проверки:
```sql
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'players' 
AND column_name IN ('individual_training', 'skate_services')
ORDER BY column_name;
```

Должны увидеть:
- `individual_training` | `text[]` | `YES` | `{}`
- `skate_services` | `text[]` | `YES` | `{}`

