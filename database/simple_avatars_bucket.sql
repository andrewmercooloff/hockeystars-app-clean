-- Простой скрипт для создания bucket avatars
-- Выполните этот скрипт в SQL Editor в Supabase Dashboard

-- Создаем bucket avatars
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Создаем простую политику для публичного доступа
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

-- Создаем политику для загрузки
CREATE POLICY "Upload Access" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'avatars'); 