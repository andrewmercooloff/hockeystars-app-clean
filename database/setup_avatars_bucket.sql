-- Настройка bucket для аватаров в Supabase Storage
-- Выполните этот скрипт в SQL Editor в Supabase Dashboard

-- 1. Создание bucket для аватаров (если не существует)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Политика для публичного доступа к аватарам (чтение)
CREATE POLICY "Public Access to Avatars" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

-- 3. Политика для загрузки аватаров авторизованными пользователями
CREATE POLICY "Authenticated users can upload avatars" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
);

-- 4. Политика для обновления аватаров авторизованными пользователями
CREATE POLICY "Users can update their own avatars" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
);

-- 5. Политика для удаления аватаров авторизованными пользователями
CREATE POLICY "Users can delete their own avatars" ON storage.objects
FOR DELETE USING (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
);

-- Проверка создания bucket
SELECT * FROM storage.buckets WHERE id = 'avatars';

-- Проверка политик
SELECT * FROM storage.policies WHERE bucket_id = 'avatars'; 