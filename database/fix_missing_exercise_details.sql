-- Исправляем отсутствующие детали для упражнений

-- Упражнение 22: Fast Push-ups
UPDATE exercises SET 
  benefits_ru = '["Развивает взрывную силу рук","Улучшает координацию","Укрепляет грудные мышцы","Повышает выносливость"]',
  benefits_en = '["Develops explosive arm power","Improves coordination","Strengthens chest muscles","Increases endurance"]',
  instructions_ru = '["Примите упор лежа","Руки на ширине плеч","Опуститесь до касания грудью пола","Быстро отожмитесь вверх","Повторите 15-20 раз","Отдыхайте 1-2 минуты между подходами"]',
  instructions_en = '["Get into push-up position","Hands shoulder-width apart","Lower until chest touches floor","Quickly push back up","Repeat 15-20 times","Rest 1-2 minutes between sets"]',
  tips_ru = '["Держите тело прямым","Не прогибайтесь в пояснице","Дышите равномерно","Начинайте с меньшего количества повторений"]',
  tips_en = '["Keep body straight","Don''t arch your back","Breathe evenly","Start with fewer repetitions"]',
  equipment_ru = 'Не требуется',
  equipment_en = 'Not required',
  calories_ru = '100-200 ккал',
  calories_en = '100-200 kcal'
WHERE exercise_id = '22';

-- Проверяем другие упражнения с пустыми массивами
-- Упражнение 23: Obstacle Jumps
UPDATE exercises SET 
  benefits_ru = '["Развивает ловкость","Улучшает координацию","Укрепляет ноги","Повышает реакцию"]',
  benefits_en = '["Develops agility","Improves coordination","Strengthens legs","Increases reaction"]',
  instructions_ru = '["Поставьте конусы на расстоянии 1-2 метра","Прыгайте через препятствия","Приземляйтесь на обе ноги","Повторите 3 прохода"]',
  instructions_en = '["Place cones 1-2 meters apart","Jump over obstacles","Land on both feet","Repeat 3 passes"]',
  tips_ru = '["Приземляйтесь мягко","Держите колени слегка согнутыми","Не торопитесь","Следите за техникой"]',
  tips_en = '["Land softly","Keep knees slightly bent","Don''t rush","Focus on technique"]',
  equipment_ru = 'Конусы или барьеры',
  equipment_en = 'Cones or barriers',
  calories_ru = '80-120 ккал',
  calories_en = '80-120 kcal'
WHERE exercise_id = '23';

-- Упражнение 24: Fast Squats
UPDATE exercises SET 
  benefits_ru = '["Укрепляет ноги","Развивает выносливость","Улучшает координацию","Сжигает калории"]',
  benefits_en = '["Strengthens legs","Develops endurance","Improves coordination","Burns calories"]',
  instructions_ru = '["Встаньте прямо","Ноги на ширине плеч","Приседайте до параллели с полом","Быстро вставайте","Повторите 20-25 раз"]',
  instructions_en = '["Stand straight","Feet shoulder-width apart","Squat to parallel with floor","Quickly stand up","Repeat 20-25 times"]',
  tips_ru = '["Держите спину прямой","Не отрывайте пятки","Дышите равномерно","Начинайте медленно"]',
  tips_en = '["Keep back straight","Don''t lift heels","Breathe evenly","Start slowly"]',
  equipment_ru = 'Не требуется',
  equipment_en = 'Not required',
  calories_ru = '120-180 ккал',
  calories_en = '120-180 kcal'
WHERE exercise_id = '24';

-- Упражнение 25: Medicine Ball Throws
UPDATE exercises SET 
  benefits_ru = '["Развивает силу корпуса","Улучшает координацию","Укрепляет руки","Повышает мощность"]',
  benefits_en = '["Develops core strength","Improves coordination","Strengthens arms","Increases power"]',
  instructions_ru = '["Возьмите мяч 5-8 кг","Встаньте прямо","Поднимите мяч к груди","Бросьте с максимальной силой","Поймайте отскок","Повторите 15 раз"]',
  instructions_en = '["Take 5-8 kg ball","Stand straight","Lift ball to chest","Throw with maximum force","Catch the bounce","Repeat 15 times"]',
  tips_ru = '["Используйте все тело","Не только руки","Держите спину прямой","Начинайте с легкого мяча"]',
  tips_en = '["Use whole body","Not just arms","Keep back straight","Start with lighter ball"]',
  equipment_ru = 'Мяч 5-8 кг',
  equipment_en = '5-8 kg ball',
  calories_ru = '150-200 ккал',
  calories_en = '150-200 kcal'
WHERE exercise_id = '25';

-- Обновляем equipment и calories для всех упражнений на английский
UPDATE exercises SET 
  equipment_en = CASE 
    WHEN equipment_ru = 'Не требуется' THEN 'Not required'
    WHEN equipment_ru = 'Беговая дорожка или стадион' THEN 'Treadmill or stadium'
    WHEN equipment_ru = 'Коврик для упражнений (опционально)' THEN 'Exercise mat (optional)'
    WHEN equipment_ru = 'Велосипед или велотренажер' THEN 'Bicycle or stationary bike'
    WHEN equipment_ru = 'Открытое пространство или беговая дорожка' THEN 'Open space or treadmill'
    WHEN equipment_ru = 'Мяч 2-4 кг, стена' THEN '2-4 kg ball, wall'
    WHEN equipment_ru = 'Стена или стул для опоры' THEN 'Wall or chair for support'
    WHEN equipment_ru = 'Лестница' THEN 'Stairs'
    WHEN equipment_ru = 'Скакалка' THEN 'Jump rope'
    WHEN equipment_ru = 'Конусы или барьеры' THEN 'Cones or barriers'
    WHEN equipment_ru = 'Мяч 5-8 кг' THEN '5-8 kg ball'
    ELSE equipment_ru
  END,
  calories_en = REPLACE(calories_ru, 'ккал', 'kcal')
WHERE equipment_en IS NULL OR calories_en IS NULL;



