-- Добавление дополнительных упражнений (16-20)
-- Выполните этот скрипт в Supabase SQL Editor

-- Упражнение 16
INSERT INTO exercises (
  exercise_id, category, duration, difficulty,
  title_ru, description_ru, benefits_ru, instructions_ru, tips_ru, equipment_ru, calories_ru,
  title_en, description_en, benefits_en, instructions_en, tips_en, equipment_en, calories_en
) VALUES (
  '16', 'Сила', '15-20 мин', 'Средний',
  'Приседания с прыжком',
  'Приседания с выпрыгиванием вверх. 4 подхода по 12-15 повторений.',
  '["Укрепляет мышцы ног", "Развивает взрывную силу", "Улучшает координацию", "Повышает выносливость"]',
  '["Встаньте прямо, ноги на ширине плеч", "Присядьте до параллели с полом", "Выпрыгните вверх с поднятыми руками", "Приземлитесь мягко и повторите"]',
  '["Держите спину прямой", "Приземляйтесь на полусогнутые ноги", "Работайте в своем темпе"]',
  'Не требуется',
  '150-200 ккал за тренировку',
  'Jump Squats',
  'Squats with jumping up. 4 sets of 12-15 repetitions.',
  '["Strengthens leg muscles", "Develops explosive power", "Improves coordination", "Increases endurance"]',
  '["Stand straight, feet shoulder-width apart", "Squat to parallel with floor", "Jump up with arms raised", "Land softly and repeat"]',
  '["Keep your back straight", "Land on bent knees", "Work at your own pace"]',
  'Not required',
  '150-200 kcal per workout'
);

-- Упражнение 17
INSERT INTO exercises (
  exercise_id, category, duration, difficulty,
  title_ru, description_ru, benefits_ru, instructions_ru, tips_ru, equipment_ru, calories_ru,
  title_en, description_en, benefits_en, instructions_en, tips_en, equipment_en, calories_en
) VALUES (
  '17', 'Выносливость', '20-25 мин', 'Средний',
  'Планка с подтягиванием коленей',
  'Планка с поочередным подтягиванием коленей к груди. 3 подхода по 30 секунд.',
  '["Укрепляет мышцы кора", "Развивает стабильность", "Улучшает баланс", "Повышает выносливость"]',
  '["Примите положение планки", "Подтяните правое колено к груди", "Вернитесь в планку", "Подтяните левое колено к груди", "Повторите"]',
  '["Держите тело в прямой линии", "Не раскачивайтесь", "Дышите равномерно"]',
  'Коврик для упражнений',
  '120-180 ккал за тренировку',
  'Plank with Knee Tucks',
  'Plank with alternating knee pulls to chest. 3 sets of 30 seconds.',
  '["Strengthens core muscles", "Develops stability", "Improves balance", "Increases endurance"]',
  '["Assume plank position", "Pull right knee to chest", "Return to plank", "Pull left knee to chest", "Repeat"]',
  '["Keep body in straight line", "Don''t sway", "Breathe evenly"]',
  'Exercise mat',
  '120-180 kcal per workout'
);

-- Упражнение 18
INSERT INTO exercises (
  exercise_id, category, duration, difficulty,
  title_ru, description_ru, benefits_ru, instructions_ru, tips_ru, equipment_ru, calories_ru,
  title_en, description_en, benefits_en, instructions_en, tips_en, equipment_en, calories_en
) VALUES (
  '18', 'Ловкость', '10-15 мин', 'Начинающий',
  'Боковые прыжки',
  'Прыжки в стороны через линию или предмет. 4 подхода по 20 секунд.',
  '["Развивает ловкость", "Улучшает координацию", "Укрепляет ноги", "Повышает скорость реакции"]',
  '["Встаньте рядом с линией", "Прыгайте влево через линию", "Прыгайте вправо через линию", "Повторяйте быстро"]',
  '["Прыгайте на носках", "Держите колени слегка согнутыми", "Работайте в быстром темпе"]',
  'Не требуется',
  '100-150 ккал за тренировку',
  'Lateral Jumps',
  'Side jumps over line or object. 4 sets of 20 seconds.',
  '["Develops agility", "Improves coordination", "Strengthens legs", "Increases reaction speed"]',
  '["Stand next to line", "Jump left over line", "Jump right over line", "Repeat quickly"]',
  '["Jump on toes", "Keep knees slightly bent", "Work at fast pace"]',
  'Not required',
  '100-150 kcal per workout'
);

-- Упражнение 19
INSERT INTO exercises (
  exercise_id, category, duration, difficulty,
  title_ru, description_ru, benefits_ru, instructions_ru, tips_ru, equipment_ru, calories_ru,
  title_en, description_en, benefits_en, instructions_en, tips_en, equipment_en, calories_en
) VALUES (
  '19', 'Сила', '12-15 мин', 'Продвинутый',
  'Отжимания с хлопком',
  'Отжимания с хлопком в ладоши в верхней точке. 3 подхода по 8-12 повторений.',
  '["Развивает взрывную силу", "Укрепляет грудь и руки", "Улучшает координацию", "Повышает мощность"]',
  '["Примите положение отжимания", "Опуститесь вниз", "Резко оттолкнитесь вверх", "Хлопните в ладоши", "Вернитесь в исходное положение"]',
  '["Начинайте медленно", "Увеличивайте скорость постепенно", "Следите за техникой"]',
  'Не требуется',
  '120-180 ккал за тренировку',
  'Clap Push-ups',
  'Push-ups with clapping hands at top. 3 sets of 8-12 repetitions.',
  '["Develops explosive power", "Strengthens chest and arms", "Improves coordination", "Increases power"]',
  '["Assume push-up position", "Lower down", "Push up explosively", "Clap hands", "Return to starting position"]',
  '["Start slowly", "Gradually increase speed", "Watch your technique"]',
  'Not required',
  '120-180 kcal per workout'
);

-- Упражнение 20
INSERT INTO exercises (
  exercise_id, category, duration, difficulty,
  title_ru, description_ru, benefits_ru, instructions_ru, tips_ru, equipment_ru, calories_ru,
  title_en, description_en, benefits_en, instructions_en, tips_en, equipment_en, calories_en
) VALUES (
  '20', 'Растяжка', '15-20 мин', 'Начинающий',
  'Растяжка всего тела',
  'Комплекс упражнений для растяжки всех групп мышц. Выполнять медленно и плавно.',
  '["Улучшает гибкость", "Снимает напряжение", "Ускоряет восстановление", "Предотвращает травмы"]',
  '["Начните с растяжки шеи", "Растяните плечи и руки", "Растяните спину и корпус", "Растяните ноги", "Завершите глубоким дыханием"]',
  '["Не делайте резких движений", "Дышите глубоко", "Оставайтесь в каждом положении 30 секунд"]',
  'Коврик для упражнений',
  '80-120 ккал за тренировку',
  'Full Body Stretch',
  'Complex of exercises for stretching all muscle groups. Perform slowly and smoothly.',
  '["Improves flexibility", "Relieves tension", "Accelerates recovery", "Prevents injuries"]',
  '["Start with neck stretch", "Stretch shoulders and arms", "Stretch back and core", "Stretch legs", "Finish with deep breathing"]',
  '["Don''t make sudden movements", "Breathe deeply", "Hold each position for 30 seconds"]',
  'Exercise mat',
  '80-120 kcal per workout'
);

-- Проверяем результат
SELECT COUNT(*) as total_exercises FROM exercises;
SELECT exercise_id, title_ru, category, difficulty 
FROM exercises 
WHERE exercise_id::int >= 16
ORDER BY exercise_id::int;



