-- Проверка текущего телефона Egor Sharangovich

SELECT 
  id, 
  name, 
  username, 
  phone,
  status
FROM players 
WHERE username = 'sharan' OR name ILIKE '%SHARANGOVICH%';


