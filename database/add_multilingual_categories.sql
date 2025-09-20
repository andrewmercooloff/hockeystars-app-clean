-- Добавление мультиязычных колонок для категорий и сложности
-- Выполните этот скрипт в Supabase SQL Editor

-- Добавляем колонки для категорий на разных языках
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS category_ru VARCHAR(100);
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS category_en VARCHAR(100);

-- Добавляем колонки для сложности на разных языках
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS difficulty_ru VARCHAR(20);
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS difficulty_en VARCHAR(20);

-- Заполняем русские категории
UPDATE exercises SET category_ru = 'Выносливость' WHERE exercise_id IN ('1', '2', '3');
UPDATE exercises SET category_ru = 'Взрывная скорость' WHERE exercise_id IN ('4', '5');
UPDATE exercises SET category_ru = 'Разминка' WHERE exercise_id IN ('6', '7', '8');
UPDATE exercises SET category_ru = 'Растяжка' WHERE exercise_id IN ('9', '10');
UPDATE exercises SET category_ru = 'Ловкость' WHERE exercise_id IN ('11', '12');
UPDATE exercises SET category_ru = 'Сила' WHERE exercise_id IN ('13', '14', '15');
UPDATE exercises SET category_ru = 'Баланс' WHERE exercise_id IN ('16', '17');
UPDATE exercises SET category_ru = 'Скоростная выносливость' WHERE exercise_id IN ('18', '19', '20');
UPDATE exercises SET category_ru = 'Восстановление' WHERE exercise_id IN ('21', '22');

-- Заполняем английские категории
UPDATE exercises SET category_en = 'Endurance' WHERE exercise_id IN ('1', '2', '3');
UPDATE exercises SET category_en = 'Explosive Speed' WHERE exercise_id IN ('4', '5');
UPDATE exercises SET category_en = 'Warm-up' WHERE exercise_id IN ('6', '7', '8');
UPDATE exercises SET category_en = 'Stretching' WHERE exercise_id IN ('9', '10');
UPDATE exercises SET category_en = 'Agility' WHERE exercise_id IN ('11', '12');
UPDATE exercises SET category_en = 'Strength' WHERE exercise_id IN ('13', '14', '15');
UPDATE exercises SET category_en = 'Balance' WHERE exercise_id IN ('16', '17');
UPDATE exercises SET category_en = 'Speed Endurance' WHERE exercise_id IN ('18', '19', '20');
UPDATE exercises SET category_en = 'Recovery' WHERE exercise_id IN ('21', '22');

-- Заполняем русские сложности
UPDATE exercises SET difficulty_ru = 'Начинающий' WHERE exercise_id IN ('6', '7', '8', '9', '10');
UPDATE exercises SET difficulty_ru = 'Средний' WHERE exercise_id IN ('1', '3', '4', '5', '11', '12', '13', '14', '15', '18', '19', '20');
UPDATE exercises SET difficulty_ru = 'Продвинутый' WHERE exercise_id IN ('2', '16', '17', '21', '22');

-- Заполняем английские сложности
UPDATE exercises SET difficulty_en = 'Beginner' WHERE exercise_id IN ('6', '7', '8', '9', '10');
UPDATE exercises SET difficulty_en = 'Intermediate' WHERE exercise_id IN ('1', '3', '4', '5', '11', '12', '13', '14', '15', '18', '19', '20');
UPDATE exercises SET difficulty_en = 'Advanced' WHERE exercise_id IN ('2', '16', '17', '21', '22');

-- Показываем результат
SELECT 
  exercise_id,
  category_ru,
  category_en,
  difficulty_ru,
  difficulty_en
FROM exercises 
ORDER BY exercise_id::int
LIMIT 10;



