-- Восстановление всех 65 упражнений в базе данных
-- Выполните этот скрипт в Supabase SQL Editor

-- Сначала удаляем все существующие упражнения
DELETE FROM exercises;

-- Теперь выполните содержимое файла add_all_exercises.sql
-- (скопируйте и вставьте содержимое add_all_exercises.sql после этой строки)

-- Или выполните этот код для добавления первых 10 упражнений:

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

-- Проверяем результат
SELECT COUNT(*) as total_exercises FROM exercises;



