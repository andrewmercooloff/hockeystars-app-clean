# 🚀 Быстрое исправление доступа к Storage

## 🎯 Проблема
Bucket `avatars` существует, но не доступен через API. Приложение не может получить доступ к изображениям.

## ⚡ Быстрое решение

### 1️⃣ Исправить политики доступа
Выполните в SQL Editor:

```sql
-- Удаляем старые политики
DROP POLICY IF EXISTS "Public Access to Avatars" ON storage.objects;
DROP POLICY IF EXISTS "Upload Access to Avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Upload Access" ON storage.objects;

-- Создаем новые политики
CREATE POLICY "Public Access to Avatars" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Upload Access to Avatars" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Update Access to Avatars" ON storage.objects
FOR UPDATE USING (bucket_id = 'avatars');

CREATE POLICY "Delete Access to Avatars" ON storage.objects
FOR DELETE USING (bucket_id = 'avatars');

-- Делаем bucket публичным
UPDATE storage.buckets SET public = true WHERE id = 'avatars';
```

### 2️⃣ Проверить исправление
```bash
node debug_storage_access.js
```
Должно показать: `✅ Bucket "avatars" найден`

### 3️⃣ Исправить в приложении
1. Откройте приложение
2. Войдите как администратор
3. В админской панели нажмите **"Исправить все"**
4. Проверьте результат через **"Диагностика"**

## ✅ Результат
Bucket будет доступен через API, изображения будут загружаться из Storage!

## 📞 Если не работает
- Проверьте логи из `debug_storage_access.js`
- Убедитесь, что SQL скрипт выполнился без ошибок
- Попробуйте пересоздать bucket (см. полную инструкцию) 