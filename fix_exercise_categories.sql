-- Исправление категорий упражнений
-- Выполните этот скрипт в Supabase SQL Editor

-- ПРАВИЛЬНАЯ ГРУППИРОВКА УПРАЖНЕНИЙ:
-- #13-15: Лестница координации, Жонглирование, Быстрые касания конусов → ЛОВКОСТЬ
-- #11-12: Растяжка спины и плеч, Йога для хоккеистов → РАСТЯЖКА  
-- #21-22: Прыжки в длину с места, Быстрые отжимания → СИЛА
-- #23-25, #53-56, #60: Прыжки, приседания, фартлек, спринты → ВЫНОСЛИВОСТЬ
-- #26-30: Разминка суставов → РАЗМИНКА
-- #31-35, #58, #64: Растяжки → РАСТЯЖКА
-- #36-40: Ловкость → ЛОВКОСТЬ
-- #41-45: Силовые → СИЛА
-- #46-52: Баланс → БАЛАНС
-- #57: Плиометрические круги → СКОРОСТНАЯ ВЫНОСЛИВОСТЬ
-- #59, #61-65: Восстановление → ВОССТАНОВЛЕНИЕ

-- Обновляем категории и сложности для упражнений #11-65

-- Выносливость (Endurance)
UPDATE exercises SET 
  category = 'Выносливость',
  category_ru = 'Выносливость',
  category_en = 'Endurance',
  difficulty = 'Начинающий',
  difficulty_ru = 'Начинающий',
  difficulty_en = 'Beginner'
WHERE exercise_id IN ('23', '24', '25');

UPDATE exercises SET 
  category = 'Выносливость',
  category_ru = 'Выносливость',
  category_en = 'Endurance',
  difficulty = 'Средний',
  difficulty_ru = 'Средний',
  difficulty_en = 'Intermediate'
WHERE exercise_id IN ('53', '54', '55');

UPDATE exercises SET 
  category = 'Выносливость',
  category_ru = 'Выносливость',
  category_en = 'Endurance',
  difficulty = 'Продвинутый',
  difficulty_ru = 'Продвинутый',
  difficulty_en = 'Advanced'
WHERE exercise_id = '56';

UPDATE exercises SET 
  category = 'Выносливость',
  category_ru = 'Выносливость',
  category_en = 'Endurance',
  difficulty = 'Начинающий',
  difficulty_ru = 'Начинающий',
  difficulty_en = 'Beginner'
WHERE exercise_id = '60';

-- Разминка (Warm-up)
UPDATE exercises SET 
  category = 'Разминка',
  category_ru = 'Разминка',
  category_en = 'Warm-up',
  difficulty = 'Начинающий',
  difficulty_ru = 'Начинающий',
  difficulty_en = 'Beginner'
WHERE exercise_id IN ('26', '27', '28', '29', '30');

-- Растяжка (Stretching)
UPDATE exercises SET 
  category = 'Растяжка',
  category_ru = 'Растяжка',
  category_en = 'Stretching',
  difficulty = 'Начинающий',
  difficulty_ru = 'Начинающий',
  difficulty_en = 'Beginner'
WHERE exercise_id IN ('11', '12', '31', '32', '33', '34', '35', '58', '64');

-- Ловкость (Agility)
UPDATE exercises SET 
  category = 'Ловкость',
  category_ru = 'Ловкость',
  category_en = 'Agility',
  difficulty = 'Средний',
  difficulty_ru = 'Средний',
  difficulty_en = 'Intermediate'
WHERE exercise_id IN ('13', '14', '15', '36', '37', '38', '39', '40');

-- Сила (Strength)
UPDATE exercises SET 
  category = 'Сила',
  category_ru = 'Сила',
  category_en = 'Strength',
  difficulty = 'Средний',
  difficulty_ru = 'Средний',
  difficulty_en = 'Intermediate'
WHERE exercise_id IN ('21', '22', '41', '42', '43', '44', '45');

-- Баланс (Balance)
UPDATE exercises SET 
  category = 'Баланс',
  category_ru = 'Баланс',
  category_en = 'Balance',
  difficulty = 'Продвинутый',
  difficulty_ru = 'Продвинутый',
  difficulty_en = 'Advanced'
WHERE exercise_id IN ('46', '47', '48', '49', '50', '51', '52');

-- Скоростная выносливость (Speed Endurance)
UPDATE exercises SET 
  category = 'Скоростная выносливость',
  category_ru = 'Скоростная выносливость',
  category_en = 'Speed Endurance',
  difficulty = 'Продвинутый',
  difficulty_ru = 'Продвинутый',
  difficulty_en = 'Advanced'
WHERE exercise_id = '57';

-- Восстановление (Recovery)
UPDATE exercises SET 
  category = 'Восстановление',
  category_ru = 'Восстановление',
  category_en = 'Recovery',
  difficulty = 'Продвинутый',
  difficulty_ru = 'Продвинутый',
  difficulty_en = 'Advanced'
WHERE exercise_id = '59';

UPDATE exercises SET 
  category = 'Восстановление',
  category_ru = 'Восстановление',
  category_en = 'Recovery',
  difficulty = 'Начинающий',
  difficulty_ru = 'Начинающий',
  difficulty_en = 'Beginner'
WHERE exercise_id IN ('61', '62', '63', '65');

-- Проверяем результат
SELECT 
  category, 
  COUNT(*) as count,
  STRING_AGG(exercise_id, ', ' ORDER BY exercise_id::int) as exercise_ids
FROM exercises 
WHERE is_active = true
GROUP BY category 
ORDER BY category;

-- Показываем все сложности
SELECT 
  difficulty, 
  COUNT(*) as count
FROM exercises 
WHERE is_active = true
GROUP BY difficulty 
ORDER BY difficulty;
