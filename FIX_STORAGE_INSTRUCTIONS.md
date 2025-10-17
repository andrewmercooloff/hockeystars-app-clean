# 🔧 Исправление проблемы с изображениями в Supabase Storage

## 🚨 **Проблема найдена!**

Изображения загружаются в Supabase Storage, но **Content-Length = 0** из-за неправильных RLS (Row Level Security) политик.

## 📋 **Что нужно сделать:**

### 1. **Выполните SQL скрипт в Supabase:**

Откройте **Supabase Dashboard** → **SQL Editor** и выполните содержимое файла `database/fix_storage_rls.sql`

### 2. **Или скопируйте этот код:**

```sql
-- Исправление RLS политик для Supabase Storage
INSERT INTO storage.buckets (id, name, public)
VALUES ('items', 'items', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload items" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own items" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own items" ON storage.objects;

CREATE POLICY "Public Access" ON storage.objects
FOR SELECT USING (bucket_id = 'items');

CREATE POLICY "Authenticated users can upload items" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'items');

CREATE POLICY "Users can update own items" ON storage.objects
FOR UPDATE USING (bucket_id = 'items');

CREATE POLICY "Users can delete own items" ON storage.objects
FOR DELETE USING (bucket_id = 'items');

UPDATE storage.buckets 
SET public = true 
WHERE id = 'items';

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
```

## ✅ **После выполнения:**

1. **Перезапустите приложение** (`npx expo start --clear`)
2. **Попробуйте загрузить новое изображение**
3. **Проверьте логи** - теперь должно быть `contentLength > 0`
4. **Изображения должны отображаться** в музее

## 🔍 **Что исправляет этот скрипт:**

- ✅ **Публичный доступ на чтение** для bucket 'items'
- ✅ **Правильные RLS политики** для загрузки/обновления/удаления
- ✅ **Bucket помечен как публичный** для внешнего доступа

## 📱 **Тестирование:**

После исправления попробуйте:
1. Загрузить новый предмет
2. Проверить логи: `contentLength` должен быть > 0
3. Открыть музей - изображения должны отображаться

---

**Выполните SQL скрипт и протестируйте загрузку нового изображения!**

