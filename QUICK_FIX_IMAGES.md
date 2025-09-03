# 🚀 Быстрое исправление проблемы с изображениями

## 🎯 Проблема
Изображения видны только на том устройстве, где их загрузили. Нужно синхронизировать через Supabase Storage.

## ⚡ Быстрое решение (3 шага)

### 1️⃣ Создать bucket avatars
1. Откройте: https://supabase.com/dashboard
2. Выберите проект: `jvsypfwiajuwsyuzkyda`
3. Перейдите в **SQL Editor**
4. Выполните скрипт (политики уже существуют):

```sql
-- Создаем только bucket avatars
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Проверяем создание
SELECT * FROM storage.buckets WHERE id = 'avatars';
```

**Примечание**: Если получаете ошибку о том, что политики уже существуют - это нормально! Политики уже созданы, нужно только bucket.

### 2️⃣ Проверить создание
```bash
node test_image_upload.js
```
Должно показать: `✅ Bucket "avatars" найден`

### 3️⃣ Исправить в приложении
1. Откройте приложение
2. Войдите как администратор
3. В админской панели нажмите **"Исправить все"** (фиолетовая кнопка)
4. Дождитесь завершения
5. Проверьте результат через **"Диагностика"**

## ✅ Результат
Все изображения будут синхронизироваться между устройствами!

## 📞 Если не работает
- Проверьте логи в консоли
- Убедитесь, что SQL скрипт выполнился
- Попробуйте пошагово: "Очистка" → "Миграция" → "Исправить URL"

## 🔍 Дополнительная диагностика
Если нужно проверить текущее состояние Storage, выполните:
```sql
-- Проверка состояния Storage
SELECT 'BUCKETS:' as info;
SELECT id, name, public FROM storage.buckets;

SELECT 'POLICIES:' as info;
SELECT policyname, cmd FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage';
``` 