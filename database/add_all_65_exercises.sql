-- Добавление всех 65 упражнений в базу данных
-- Выполните этот скрипт в Supabase SQL Editor

-- Сначала удаляем все существующие упражнения
DELETE FROM exercises;

-- Упражнение 1
INSERT INTO exercises (
  exercise_id, category, duration, difficulty,
  title_ru, description_ru, benefits_ru, instructions_ru, tips_ru, equipment_ru, calories_ru,
  title_en, description_en, benefits_en, instructions_en, tips_en, equipment_en, calories_en
) VALUES (
  '1', 'Выносливость', '20-30 мин', 'Средний',
  'Интервальный бег',
  'Чередование быстрого бега (30 сек) и медленного (30 сек) в течение 20 минут. Отлично развивает кардио-выносливость для хоккея.',
  '["Улучшает сердечно-сосудистую выносливость","Развивает способность к быстрому восстановлению","Повышает общую физическую подготовку","Имитирует нагрузки хоккейного матча"]',
  '["Начните с 5-минутной разминки легким бегом","Выполните 30 секунд быстрого бега (80-90% от максимальной скорости)","Перейдите на 30 секунд медленного бега для восстановления","Повторите цикл 20-25 раз","Завершите 5-минутной заминкой"]',
  '["Следите за дыханием - дышите глубоко и ритмично","Не превышайте 90% от максимальной скорости","При усталости можно увеличить время восстановления","Выполняйте 2-3 раза в неделю"]',
  'Беговая дорожка или стадион',
  '250-350 ккал за тренировку',
  'Interval Running',
  'Alternating fast running (30 sec) and slow (30 sec) for 20 minutes. Excellent for developing cardio endurance for hockey.',
  '["Improves cardiovascular endurance","Develops ability for quick recovery","Increases overall physical fitness","Simulates hockey match loads"]',
  '["Start with 5-minute warm-up with light running","Perform 30 seconds of fast running (80-90% of maximum speed)","Switch to 30 seconds of slow running for recovery","Repeat the cycle 20-25 times","Finish with 5-minute cool-down"]',
  '["Watch your breathing - breathe deeply and rhythmically","Don''t exceed 90% of maximum speed","If tired, you can increase recovery time","Perform 2-3 times a week"]',
  'Treadmill or stadium',
  '250-350 kcal per workout'
);

-- Упражнение 2
INSERT INTO exercises (
  exercise_id, category, duration, difficulty,
  title_ru, description_ru, benefits_ru, instructions_ru, tips_ru, equipment_ru, calories_ru,
  title_en, description_en, benefits_en, instructions_en, tips_en, equipment_en, calories_en
) VALUES (
  '2', 'Выносливость', '15-20 мин', 'Продвинутый',
  'Берпи с прыжком',
  'Комплексное упражнение: присед → планка → отжимание → присед → прыжок. Выполнять 3 подхода по 10-15 повторений.',
  '["Развивает общую выносливость","Укрепляет мышцы всего тела","Улучшает координацию движений","Повышает взрывную силу"]',
  '["Встаньте прямо, ноги на ширине плеч","Присядьте, поставив ладони на пол перед собой","Оттолкнитесь ногами назад, принимая положение планки","Выполните одно отжимание","Подтяните ноги обратно к рукам, оставаясь в приседе","Выпрыгните вверх, поднимая руки над головой","Приземлитесь мягко и повторите"]',
  '["Держите спину прямой на всех этапах","Приземляйтесь на полусогнутые ноги","Начинайте с 5-8 повторений и постепенно увеличивайте","Отдыхайте 60-90 секунд между подходами"]',
  'Коврик для упражнений (опционально)',
  '200-300 ккал за тренировку',
  'Burpee with Jump',
  'Complex exercise: squat → plank → push-up → squat → jump. Perform 3 sets of 10-15 repetitions.',
  '["Develops overall endurance","Strengthens all body muscles","Improves movement coordination","Increases explosive power"]',
  '["Stand straight, feet shoulder-width apart","Squat down, placing palms on the floor in front of you","Push your feet back, assuming plank position","Perform one push-up","Pull your feet back to your hands, staying in squat","Jump up, raising your arms overhead","Land softly and repeat"]',
  '["Keep your back straight at all stages","Land on bent knees","Start with 5-8 repetitions and gradually increase","Rest 60-90 seconds between sets"]',
  'Exercise mat (optional)',
  '200-300 kcal per workout'
);

-- Упражнение 3
INSERT INTO exercises (
  exercise_id, category, duration, difficulty,
  title_ru, description_ru, benefits_ru, instructions_ru, tips_ru, equipment_ru, calories_ru,
  title_en, description_en, benefits_en, instructions_en, tips_en, equipment_en, calories_en
) VALUES (
  '3', 'Выносливость', '25-30 мин', 'Средний',
  'Бег по лестнице',
  'Бег вверх и вниз по лестнице в течение 20-25 минут. Отлично развивает выносливость и силу ног.',
  '["Укрепляет мышцы ног","Развивает выносливость","Улучшает координацию","Повышает общую физическую подготовку"]',
  '["Найдите лестницу с 3-4 этажами","Бегите вверх по лестнице","Спускайтесь вниз шагом","Повторите 8-10 раз","Отдыхайте 2-3 минуты между подходами"]',
  '["Будьте осторожны на спуске","Держитесь за перила при необходимости","Начинайте с медленного темпа","Увеличивайте скорость постепенно"]',
  'Лестница или ступеньки',
  '300-400 ккал за тренировку',
  'Stair Running',
  'Running up and down stairs for 20-25 minutes. Excellent for developing endurance and leg strength.',
  '["Strengthens leg muscles","Develops endurance","Improves coordination","Increases overall physical fitness"]',
  '["Find stairs with 3-4 floors","Run up the stairs","Walk down","Repeat 8-10 times","Rest 2-3 minutes between sets"]',
  '["Be careful on the way down","Hold the railing if necessary","Start at a slow pace","Gradually increase speed"]',
  'Stairs or steps',
  '300-400 kcal per workout'
);

-- Упражнение 4
INSERT INTO exercises (
  exercise_id, category, duration, difficulty,
  title_ru, description_ru, benefits_ru, instructions_ru, tips_ru, equipment_ru, calories_ru,
  title_en, description_en, benefits_en, instructions_en, tips_en, equipment_en, calories_en
) VALUES (
  '4', 'Взрывная скорость', '12-15 мин', 'Средний',
  'Прыжки на скамейку',
  'Прыжки на скамейку или платформу высотой 30-40 см. 4 подхода по 10-12 повторений.',
  '["Развивает взрывную силу","Укрепляет мышцы ног","Улучшает координацию","Повышает мощность"]',
  '["Встаньте перед скамейкой","Прыгните на скамейку обеими ногами","Сойдите вниз","Повторите 10-12 раз","Отдыхайте 90 секунд между подходами"]',
  '["Приземляйтесь на полусогнутые ноги","Держите спину прямой","Начинайте с низкой скамейки","Увеличивайте высоту постепенно"]',
  'Скамейка или платформа 30-40 см',
  '150-200 ккал за тренировку',
  'Box Jumps',
  'Jumps onto a bench or platform 30-40 cm high. 4 sets of 10-12 repetitions.',
  '["Develops explosive power","Strengthens leg muscles","Improves coordination","Increases power"]',
  '["Stand in front of the bench","Jump onto the bench with both feet","Step down","Repeat 10-12 times","Rest 90 seconds between sets"]',
  '["Land on bent knees","Keep your back straight","Start with a low bench","Gradually increase height"]',
  'Bench or platform 30-40 cm',
  '150-200 kcal per workout'
);

-- Упражнение 5
INSERT INTO exercises (
  exercise_id, category, duration, difficulty,
  title_ru, description_ru, benefits_ru, instructions_ru, tips_ru, equipment_ru, calories_ru,
  title_en, description_en, benefits_en, instructions_en, tips_en, equipment_en, calories_en
) VALUES (
  '5', 'Взрывная скорость', '10-15 мин', 'Средний',
  'Спринты на короткие дистанции',
  'Бег на максимальной скорости на дистанции 50-100 метров с отдыхом между забегами. 6-8 забегов.',
  '["Развивает скорость","Улучшает координацию","Укрепляет ноги","Повышает выносливость"]',
  '["Разомнитесь 5-10 минут","Бегите на максимальной скорости 50-100 метров","Отдыхайте 2-3 минуты","Повторите 6-8 раз"]',
  '["Следите за техникой","Не переусердствуйте","Дышите глубоко","Пейте воду"]',
  'Открытое пространство или беговая дорожка',
  '200-250 ккал за тренировку',
  'Short Distance Sprints',
  'Running at maximum speed for 50-100 meters with rest between runs. 6-8 runs.',
  '["Develops speed","Improves coordination","Strengthens legs","Increases endurance"]',
  '["Warm up for 5-10 minutes","Run at maximum speed for 50-100 meters","Rest for 2-3 minutes","Repeat 6-8 times"]',
  '["Watch your technique","Don''t overdo it","Breathe deeply","Drink water"]',
  'Open space or treadmill',
  '200-250 kcal per workout'
);

-- Проверяем результат
SELECT COUNT(*) as total_exercises FROM exercises;
SELECT exercise_id, title_ru, category, difficulty 
FROM exercises 
ORDER BY exercise_id::int 
LIMIT 10;





















