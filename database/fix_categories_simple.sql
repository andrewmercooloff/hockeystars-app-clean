-- Простое исправление категорий упражнений
-- Выполните этот скрипт в Supabase SQL Editor

-- Обновляем категории для первых 22 упражнений
UPDATE exercises SET category = 'Выносливость' WHERE exercise_id IN ('1', '2', '3');
UPDATE exercises SET category = 'Взрывная скорость' WHERE exercise_id IN ('4', '5');
UPDATE exercises SET category = 'Разминка' WHERE exercise_id IN ('6', '7', '8');
UPDATE exercises SET category = 'Растяжка' WHERE exercise_id IN ('9', '10');
UPDATE exercises SET category = 'Ловкость' WHERE exercise_id IN ('11', '12');
UPDATE exercises SET category = 'Сила' WHERE exercise_id IN ('13', '14', '15');
UPDATE exercises SET category = 'Баланс' WHERE exercise_id IN ('16', '17');
UPDATE exercises SET category = 'Скоростная выносливость' WHERE exercise_id IN ('18', '19', '20');
UPDATE exercises SET category = 'Восстановление' WHERE exercise_id IN ('21', '22');

-- Обновляем сложность
UPDATE exercises SET difficulty = 'Начинающий' WHERE exercise_id IN ('6', '7', '8', '9', '10');
UPDATE exercises SET difficulty = 'Средний' WHERE exercise_id IN ('1', '3', '4', '5', '11', '12', '13', '14', '15', '18', '19', '20');
UPDATE exercises SET difficulty = 'Продвинутый' WHERE exercise_id IN ('2', '16', '17', '21', '22');

-- Показываем результат
SELECT 
  category, 
  COUNT(*) as count,
  STRING_AGG(exercise_id ORDER BY exercise_id::int, ', ') as exercise_ids
FROM exercises 
GROUP BY category 
ORDER BY category;





















