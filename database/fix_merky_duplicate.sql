-- Диагностика и исправление проблемы с пользователем Merky (+375297730000)
-- Выполните этот скрипт в Supabase SQL Editor

-- 1. Проверка всех пользователей с этим телефоном
SELECT 
  id,
  name,
  phone,
  status,
  avatar,
  created_at,
  updated_at,
  CASE 
    WHEN avatar IS NULL OR avatar = '' THEN 'НЕТ ФОТО'
    ELSE 'ЕСТЬ ФОТО'
  END as has_avatar
FROM public.players
WHERE phone = '+375297730000'
ORDER BY created_at DESC;

-- 2. Если есть несколько записей, показываем детали
-- (Раскомментируйте следующий блок, если нужно удалить старые дубликаты)

-- ВАЖНО: Перед удалением проверьте, какая запись правильная!
-- Обычно правильная - самая новая (с самым поздним created_at)

-- Пример удаления старых дубликатов (ОСТОРОЖНО! Проверьте ID перед выполнением):
-- DELETE FROM public.players
-- WHERE phone = '+375297730000'
--   AND id IN (
--     SELECT id FROM (
--       SELECT id, 
--              ROW_NUMBER() OVER (ORDER BY created_at DESC) as rn
--       FROM public.players
--       WHERE phone = '+375297730000'
--     ) t
--     WHERE rn > 1  -- Оставляем только самую новую запись
--   );

-- 3. Обновление статуса и аватара для правильной записи (если нужно)
-- Замените 'PLAYER_ID_HERE' на ID правильной записи из первого запроса
-- UPDATE public.players
-- SET 
--   status = 'player',
--   -- avatar = 'URL_ФОТО_ЗДЕСЬ'  -- если нужно обновить фото
--   updated_at = NOW()
-- WHERE id = 'PLAYER_ID_HERE'
--   AND phone = '+375297730000';

-- 4. Проверка результата
SELECT 
  id,
  name,
  phone,
  status,
  avatar,
  created_at,
  updated_at
FROM public.players
WHERE phone = '+375297730000'
ORDER BY created_at DESC;

