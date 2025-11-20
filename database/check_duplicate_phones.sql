-- Проверка дубликатов пользователей по телефону
-- Находит всех пользователей с одинаковыми телефонами

SELECT 
  phone,
  COUNT(*) as count,
  STRING_AGG(id::text, ', ') as player_ids,
  STRING_AGG(name, ', ') as names,
  STRING_AGG(status, ', ') as statuses,
  STRING_AGG(COALESCE(avatar, 'нет фото'), ', ') as avatars
FROM public.players
WHERE phone IS NOT NULL AND phone != ''
GROUP BY phone
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- Проверка конкретного телефона
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


