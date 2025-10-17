-- Установка обычного телефона для Egor Sharangovich
-- Для входа нужно добавить ###### в конце номера

-- 1. Сначала найдем Egor Sharangovich
SELECT id, name, phone, status
FROM players 
WHERE name ILIKE '%SHARANGOVICH%' OR name ILIKE '%EGOR%';

-- 2. Устанавливаем ему обычный телефон
UPDATE players 
SET phone = '+375291234567'
WHERE name ILIKE '%SHARANGOVICH%';

-- 3. Проверяем что обновилось
SELECT id, name, phone, status
FROM players 
WHERE name ILIKE '%SHARANGOVICH%';

-- ИНСТРУКЦИЯ ДЛЯ ВХОДА:
-- 1. Введите телефон: +375291234567######
-- 2. Введите любой 6-значный код (например: 123456)
-- 3. Вход выполнится автоматически без проверки SMS!
-- 
-- ВАЖНО: В приложении вводить номер С решетками: +375291234567######

