-- Простой скрипт только для создания bucket avatars
-- Выполните этот скрипт в SQL Editor в Supabase Dashboard

-- Создаем bucket avatars (политики уже существуют)
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