-- Обновление категорий упражнений на английский язык
-- Выполните этот скрипт в Supabase SQL Editor

UPDATE exercises SET category = 'Endurance' WHERE category = 'Выносливость';
UPDATE exercises SET category = 'Explosive Speed' WHERE category = 'Взрывная скорость';
UPDATE exercises SET category = 'Warm-up' WHERE category = 'Разминка';
UPDATE exercises SET category = 'Stretching' WHERE category = 'Растяжка';
UPDATE exercises SET category = 'Agility' WHERE category = 'Ловкость';
UPDATE exercises SET category = 'Strength' WHERE category = 'Сила';
UPDATE exercises SET category = 'Balance' WHERE category = 'Баланс';
UPDATE exercises SET category = 'Speed Endurance' WHERE category = 'Скоростная выносливость';
UPDATE exercises SET category = 'Recovery' WHERE category = 'Восстановление';

-- Обновляем сложность на английский
UPDATE exercises SET difficulty = 'Beginner' WHERE difficulty = 'Начинающий';
UPDATE exercises SET difficulty = 'Intermediate' WHERE difficulty = 'Средний';
UPDATE exercises SET difficulty = 'Advanced' WHERE difficulty = 'Продвинутый';

-- Показываем результат
SELECT 
  category, 
  COUNT(*) as count,
  STRING_AGG(exercise_id ORDER BY exercise_id::int, ', ') as exercise_ids
FROM exercises 
GROUP BY category 
ORDER BY category;

-- Показываем все сложности
SELECT 
  difficulty, 
  COUNT(*) as count
FROM exercises 
GROUP BY difficulty 
ORDER BY difficulty;





















