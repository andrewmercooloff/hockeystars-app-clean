# 🔧 Исправление проблем с доступом к Supabase Storage

## 🎯 Проблема
Bucket `avatars` существует в Supabase Dashboard, но не доступен через API. Изображения загружены, но приложение не может к ним получить доступ.

## 🔍 Диагностика
Мы провели диагностику и обнаружили:
- ✅ Подключение к Supabase работает
- ❌ Bucket `avatars` не доступен через API
- ❌ Проблемы с правами доступа к Storage

## 🛠️ Пошаговое исправление

### Шаг 1: Проверка и исправление политик доступа

1. **Откройте Supabase Dashboard**: https://supabase.com/dashboard
2. **Выберите проект**: `jvsypfwiajuwsyuzkyda`
3. **Перейдите в SQL Editor**
4. **Выполните скрипт диагностики**:

```sql
-- Проверка текущего состояния
SELECT 'CURRENT BUCKETS:' as info;
SELECT id, name, public, file_size_limit FROM storage.buckets;

SELECT 'CURRENT POLICIES:' as info;
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage';
```

### Шаг 2: Исправление политик доступа

Выполните скрипт исправления:

```sql
-- Удаляем все существующие политики
DROP POLICY IF EXISTS "Public Access to Avatars" ON storage.objects;
DROP POLICY IF EXISTS "Upload Access to Avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Upload Access" ON storage.objects;

-- Создаем новые политики для публичного доступа
CREATE POLICY "Public Access to Avatars" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Upload Access to Avatars" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Update Access to Avatars" ON storage.objects
FOR UPDATE USING (bucket_id = 'avatars');

CREATE POLICY "Delete Access to Avatars" ON storage.objects
FOR DELETE USING (bucket_id = 'avatars');
```

### Шаг 3: Настройка bucket как публичного

```sql
-- Делаем bucket публичным
UPDATE storage.buckets 
SET public = true 
WHERE id = 'avatars';

-- Проверяем результат
SELECT id, name, public, file_size_limit 
FROM storage.buckets 
WHERE id = 'avatars';
```

### Шаг 4: Проверка исправления

После выполнения SQL скриптов запустите тест:

```bash
node debug_storage_access.js
```

Вы должны увидеть:
```
✅ Bucket "avatars" найден
   - Public: true
   - File size limit: 5242880 bytes
```

### Шаг 5: Исправление в приложении

1. **Откройте приложение**
2. **Войдите как администратор**
3. **Перейдите в админскую панель**
4. **Нажмите "Диагностика"** (зеленая кнопка)
5. **Проверьте логи** - должны увидеть изображения в Storage
6. **Нажмите "Исправить все"** (фиолетовая кнопка)

## 📋 Что происходит при исправлении

### Проблема с политиками:
- Политики могли быть созданы неправильно
- Отсутствовали политики для всех операций (SELECT, INSERT, UPDATE, DELETE)
- Bucket мог быть не помечен как публичный

### Исправление:
- Удаляем все старые политики
- Создаем новые политики для публичного доступа
- Делаем bucket публичным
- Проверяем доступность через API

## 📊 Ожидаемый результат

После исправления:
- ✅ Bucket `avatars` будет доступен через API
- ✅ Изображения будут загружаться из Storage
- ✅ Публичные URL будут работать
- ✅ Приложение будет использовать изображения из Storage вместо локальных

## 🚨 Если проблема остается

1. **Проверьте RLS (Row Level Security)**:
```sql
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'storage' AND tablename = 'objects';
```

2. **Проверьте права пользователя**:
```sql
SELECT rolname, rolsuper, rolinherit, rolcreaterole, rolcreatedb
FROM pg_roles 
WHERE rolname = 'anon';
```

3. **Попробуйте пересоздать bucket**:
```sql
-- Удаляем и пересоздаем bucket
DELETE FROM storage.buckets WHERE id = 'avatars';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
```

## 📞 Поддержка

Если проблема не решается:
- Предоставьте результаты выполнения SQL скриптов
- Логи из `debug_storage_access.js`
- Скриншот политик в Supabase Dashboard

## 🎉 Результат

После выполнения всех шагов bucket `avatars` будет доступен через API, и приложение сможет использовать изображения из Supabase Storage вместо локальных файлов. 