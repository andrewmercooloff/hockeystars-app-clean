-- Добавление всех упражнений в базу данных
-- Выполните этот скрипт в Supabase SQL Editor

-- Упражнение 1
INSERT INTO exercises (
  exercise_id, category, duration, difficulty,
  title_ru, description_ru, benefits_ru, instructions_ru, tips_ru, equipment_ru, calories_ru,
  title_en, description_en, benefits_en, instructions_en, tips_en, equipment_en, calories_en
) VALUES (
  '1',
  'Общее',
  '10-15 мин',
  'Средний',
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
  'Беговая дорожка или стадион',
  '250-350 ккал за тренировку'
);

-- Упражнение 2
INSERT INTO exercises (
  exercise_id, category, duration, difficulty,
  title_ru, description_ru, benefits_ru, instructions_ru, tips_ru, equipment_ru, calories_ru,
  title_en, description_en, benefits_en, instructions_en, tips_en, equipment_en, calories_en
) VALUES (
  '2',
  'Общее',
  '10-15 мин',
  'Средний',
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
  '["Keep your back straight at all stages","Land on semi-bent legs","Start with 5-8 repetitions and gradually increase","Rest 60-90 seconds between sets"]',
  'Коврик для упражнений (опционально)',
  '200-300 ккал за тренировку'
);

-- Упражнение 3
INSERT INTO exercises (
  exercise_id, category, duration, difficulty,
  title_ru, description_ru, benefits_ru, instructions_ru, tips_ru, equipment_ru, calories_ru,
  title_en, description_en, benefits_en, instructions_en, tips_en, equipment_en, calories_en
) VALUES (
  '3',
  'Общее',
  '10-15 мин',
  'Средний',
  'Велосипед',
  'Интенсивная езда на велосипеде или велотренажере с интервалами высокой нагрузки. 5 минут разминки, 20 минут интервалов.',
  '["Развивает кардио-выносливость","Укрепляет мышцы ног","Сжигает много калорий","Низкая нагрузка на суставы"]',
  '["5 минут разминки на низкой интенсивности","2 минуты высокой интенсивности (80-85% от максимума)","1 минута восстановления на низкой интенсивности","Повторите интервалы 10 раз","5 минут заминки на низкой интенсивности"]',
  '["Поддерживайте высокий темп педалирования (80-100 об/мин)","Следите за положением тела - спина прямая","Регулируйте сопротивление для изменения интенсивности","Пейте воду во время тренировки"]',
  'Велосипед или велотренажер',
  '300-400 ккал за тренировку',
  'Cycling',
  'Intensive cycling or stationary bike with high-intensity intervals. 5 minutes warm-up, 20 minutes intervals.',
  '["Develops cardio endurance","Strengthens leg muscles","Burns many calories","Low impact on joints"]',
  '["5 minutes warm-up at low intensity","2 minutes high intensity (80-85% of maximum)","1 minute recovery at low intensity","Repeat intervals 10 times","5 minutes cool-down at low intensity"]',
  '["Maintain high pedaling tempo (80-100 rpm)","Watch your body position - keep back straight","Adjust resistance to change intensity","Drink water during workout"]',
  'Велосипед или велотренажер',
  '300-400 ккал за тренировку'
);

-- Упражнение 4
INSERT INTO exercises (
  exercise_id, category, duration, difficulty,
  title_ru, description_ru, benefits_ru, instructions_ru, tips_ru, equipment_ru, calories_ru,
  title_en, description_en, benefits_en, instructions_en, tips_en, equipment_en, calories_en
) VALUES (
  '4',
  'Общее',
  '10-15 мин',
  'Средний',
  'Плиометрические прыжки',
  'Прыжки на месте с максимальной высотой, приземление на полусогнутые ноги. 3 подхода по 15-20 прыжков.',
  '["Развивает взрывную силу ног","Улучшает реакцию и скорость","Укрепляет сухожилия и связки","Повышает вертикальный прыжок"]',
  '["Встаньте прямо, ноги на ширине плеч","Присядьте на 1/4, согнув колени","Взрывно выпрыгните вверх, вытягивая руки","Приземлитесь на полусогнутые ноги","Сразу же выполняйте следующий прыжок","Выполните 15-20 прыжков подряд"]',
  '["Приземляйтесь мягко, сгибая колени","Держите корпус прямо","Не делайте паузы между прыжками","Отдыхайте 2-3 минуты между подходами"]',
  'Коврик для упражнений (опционально)',
  '150-200 ккал за тренировку',
  'Plyometric Jumps',
  'Jumps in place with maximum height, landing on semi-bent legs. 3 sets of 15-20 jumps.',
  '["Develops explosive leg power","Improves reaction and speed","Strengthens tendons and ligaments","Increases vertical jump"]',
  '["Stand straight, feet shoulder-width apart","Squat down 1/4, bending your knees","Explosively jump up, extending your arms","Land on semi-bent legs","Immediately perform the next jump","Perform 15-20 jumps in a row"]',
  '["Land softly, bending your knees","Keep your torso straight","Don''t pause between jumps","Rest 2-3 minutes between sets"]',
  'Коврик для упражнений (опционально)',
  '150-200 ккал за тренировку'
);

-- Упражнение 5
INSERT INTO exercises (
  exercise_id, category, duration, difficulty,
  title_ru, description_ru, benefits_ru, instructions_ru, tips_ru, equipment_ru, calories_ru,
  title_en, description_en, benefits_en, instructions_en, tips_en, equipment_en, calories_en
) VALUES (
  '5',
  'Общее',
  '10-15 мин',
  'Средний',
  'Спринты на короткие дистанции',
  'Бег на максимальной скорости на дистанции 20-30 метров с отдыхом 30 секунд между забегами. 8-10 забегов.',
  '["Развивает максимальную скорость","Улучшает ускорение","Укрепляет мышцы ног","Повышает координацию движений"]',
  '["Разметьте дистанцию 20-30 метров","Примите положение старта (полуприсед)","По сигналу бегите на максимальной скорости","Пересеките финишную линию","Медленно вернитесь к старту","Отдохните 30 секунд и повторите"]',
  '["Фокусируйтесь на технике бега","Держите корпус прямо","Работайте руками активно","Не сокращайте время отдыха"]',
  'Открытое пространство или беговая дорожка',
  '200-250 ккал за тренировку',
  'Short Distance Sprints',
  'Running at maximum speed for 20-30 meters with 30 seconds rest between runs. 8-10 runs.',
  '["Develops maximum speed","Improves acceleration","Strengthens leg muscles","Increases movement coordination"]',
  '["Mark a distance of 20-30 meters","Take starting position (half-squat)","Run at maximum speed on signal","Cross the finish line","Slowly return to start","Rest 30 seconds and repeat"]',
  '["Focus on running technique","Keep your torso straight","Work your arms actively","Don''t shorten rest time"]',
  'Открытое пространство или беговая дорожка',
  '200-250 ккал за тренировку'
);

-- Упражнение 6
INSERT INTO exercises (
  exercise_id, category, duration, difficulty,
  title_ru, description_ru, benefits_ru, instructions_ru, tips_ru, equipment_ru, calories_ru,
  title_en, description_en, benefits_en, instructions_en, tips_en, equipment_en, calories_en
) VALUES (
  '6',
  'Общее',
  '10-15 мин',
  'Средний',
  'Броски мяча в стену',
  'Броски медицинского мяча в стену с максимальной силой, ловля и повторный бросок. 3 подхода по 20 бросков.',
  '["Развивает взрывную силу рук","Улучшает координацию","Укрепляет мышцы кора","Повышает скорость броска"]',
  '["Встаньте в 1-2 метрах от стены","Держите мяч двумя руками на уровне груди","Присядьте, сгибая колени","Взрывно выпрямите ноги и руки, бросая мяч","Поймайте отскочивший мяч","Сразу же выполняйте следующий бросок"]',
  '["Используйте мяч весом 2-4 кг","Бросайте с максимальной силой","Держите спину прямой","Работайте всем телом, а не только руками"]',
  'Медицинский мяч 2-4 кг, стена',
  '120-180 ккал за тренировку',
  'Ball Throws to Wall',
  'Throwing medicine ball to wall with maximum force, catching and throwing again. 3 sets of 20 throws.',
  '["Develops explosive arm power","Improves coordination","Strengthens core muscles","Increases throwing speed"]',
  '["Stand 1-2 meters from the wall","Hold the ball with both hands at chest level","Squat down, bending your knees","Explosively straighten your legs and arms, throwing the ball","Catch the bouncing ball","Immediately perform the next throw"]',
  '["Use a ball weighing 2-4 kg","Throw with maximum force","Keep your back straight","Work with your whole body, not just your arms"]',
  'Медицинский мяч 2-4 кг, стена',
  '120-180 ккал за тренировку'
);

-- Упражнение 7
INSERT INTO exercises (
  exercise_id, category, duration, difficulty,
  title_ru, description_ru, benefits_ru, instructions_ru, tips_ru, equipment_ru, calories_ru,
  title_en, description_en, benefits_en, instructions_en, tips_en, equipment_en, calories_en
) VALUES (
  '7',
  'Общее',
  '10-15 мин',
  'Средний',
  'Динамическая растяжка ног',
  'Махи ногами вперед, назад и в стороны, круговые движения в тазобедренных суставах. 10-15 повторений каждой ногой.',
  '["Разогревает мышцы ног","Улучшает подвижность суставов","Подготавливает к тренировке","Снижает риск травм"]',
  '["Встаньте прямо, держась за опору","Выполните 10-15 махов вперед правой ногой","Выполните 10-15 махов назад правой ногой","Выполните 10-15 махов в сторону правой ногой","Повторите для левой ноги","Выполните круговые движения в тазобедренных суставах"]',
  '["Держите спину прямо","Не раскачивайтесь слишком сильно","Выполняйте движения плавно","Дышите глубоко и ритмично"]',
  'Стена или стул для опоры',
  '50-80 ккал за разминку',
  'Dynamic Leg Stretching',
  'Leg swings forward, backward and sideways, circular movements in hip joints. 10-15 repetitions each leg.',
  '["Warms up leg muscles","Improves joint mobility","Prepares for workout","Reduces injury risk"]',
  '["Stand straight, holding onto support","Perform 10-15 forward swings with right leg","Perform 10-15 backward swings with right leg","Perform 10-15 sideways swings with right leg","Repeat for left leg","Perform circular movements in hip joints"]',
  '["Keep your back straight","Don''t swing too hard","Perform movements smoothly","Breathe deeply and rhythmically"]',
  'Стена или стул для опоры',
  '50-80 ккал за разминку'
);

-- Упражнение 8
INSERT INTO exercises (
  exercise_id, category, duration, difficulty,
  title_ru, description_ru, benefits_ru, instructions_ru, tips_ru, equipment_ru, calories_ru,
  title_en, description_en, benefits_en, instructions_en, tips_en, equipment_en, calories_en
) VALUES (
  '8',
  'Общее',
  '10-15 мин',
  'Средний',
  'Разминка верхней части тела',
  'Круговые движения руками, наклоны туловища, повороты. Разогрев плечевых суставов и спины.',
  '["Разогревает мышцы верхней части тела","Улучшает подвижность плечевых суставов","Подготавливает руки к работе","Активирует мышцы кора"]',
  '["Встаньте прямо, ноги на ширине плеч","Выполните 10 круговых движений руками вперед","Выполните 10 круговых движений руками назад","Выполните 10 наклонов туловища в стороны","Выполните 10 поворотов туловища","Выполните круговые движения плечами"]',
  '["Двигайтесь медленно и плавно","Не делайте резких движений","Следите за дыханием","Постепенно увеличивайте амплитуду движений"]',
  'Не требуется',
  '40-60 ккал за разминку',
  'Upper Body Warm-up',
  'Circular arm movements, torso bends, turns. Warming up shoulder joints and back.',
  '["Warms up upper body muscles","Improves shoulder joint mobility","Prepares arms for work","Activates core muscles"]',
  '["Stand straight, feet shoulder-width apart","Perform 10 circular arm movements forward","Perform 10 circular arm movements backward","Perform 10 torso bends to the sides","Perform 10 torso turns","Perform circular shoulder movements"]',
  '["Move slowly and smoothly","Don''t make sudden movements","Watch your breathing","Gradually increase movement amplitude"]',
  'Не требуется',
  '40-60 ккал за разминку'
);

-- Упражнение 9
INSERT INTO exercises (
  exercise_id, category, duration, difficulty,
  title_ru, description_ru, benefits_ru, instructions_ru, tips_ru, equipment_ru, calories_ru,
  title_en, description_en, benefits_en, instructions_en, tips_en, equipment_en, calories_en
) VALUES (
  '9',
  'Общее',
  '10-15 мин',
  'Средний',
  'Легкий бег на месте',
  'Бег на месте с высоким подниманием коленей, постепенное увеличение темпа. 5-7 минут.',
  '["Повышает частоту сердечных сокращений","Разогревает мышцы ног","Улучшает координацию","Подготавливает к основной тренировке"]',
  '["Встаньте прямо, ноги на ширине плеч","Начните с легкого бега на месте","Постепенно поднимайте колени выше","Работайте руками, как при обычном беге","Увеличивайте темп в течение 2-3 минут","Замедляйтесь в последние 2 минуты"]',
  '["Держите спину прямо","Приземляйтесь на носки","Дышите глубоко","Не делайте слишком высокие прыжки"]',
  'Не требуется',
  '60-80 ккал за разминку',
  'Light Running in Place',
  'Running in place with high knee lifts, gradual pace increase. 5-7 minutes.',
  '["Increases heart rate","Warms up leg muscles","Improves coordination","Prepares for main workout"]',
  '["Stand straight, feet shoulder-width apart","Start with light running in place","Gradually lift your knees higher","Work your arms as in regular running","Increase pace over 2-3 minutes","Slow down in the last 2 minutes"]',
  '["Keep your back straight","Land on your toes","Breathe deeply","Don''t jump too high"]',
  'Не требуется',
  '60-80 ккал за разминку'
);

-- Упражнение 10
INSERT INTO exercises (
  exercise_id, category, duration, difficulty,
  title_ru, description_ru, benefits_ru, instructions_ru, tips_ru, equipment_ru, calories_ru,
  title_en, description_en, benefits_en, instructions_en, tips_en, equipment_en, calories_en
) VALUES (
  '10',
  'Общее',
  '10-15 мин',
  'Средний',
  'Статическая растяжка мышц ног',
  'Удержание позиций растяжки для квадрицепсов, икроножных мышц и приводящих мышц. 30 секунд на каждую группу.',
  '["Улучшает гибкость мышц ног","Снижает мышечное напряжение","Ускоряет восстановление","Предотвращает травмы"]',
  '["Растяжка квадрицепсов: встаньте на одну ногу, согните другую назад","Растяжка икр: сделайте выпад вперед, держа заднюю ногу прямой","Растяжка приводящих мышц: сядьте, разведите ноги в стороны","Удерживайте каждую позицию 30 секунд","Дышите глубоко и расслабляйте мышцы"]',
  '["Не растягивайтесь до боли","Дышите глубоко и медленно","Расслабляйте мышцы во время растяжки","Выполняйте после тренировки"]',
  'Коврик для упражнений',
  '80-100 ккал за растяжку',
  'Static Leg Muscle Stretching',
  'Holding stretching positions for quadriceps, calf muscles and adductors. 30 seconds for each group.',
  '["Improves leg muscle flexibility","Reduces muscle tension","Accelerates recovery","Prevents injuries"]',
  '["Quadriceps stretch: stand on one leg, bend the other back","Calf stretch: lunge forward, keeping back leg straight","Adductor stretch: sit down, spread legs to the sides","Hold each position for 30 seconds","Breathe deeply and relax muscles"]',
  '["Don''t stretch to the point of pain","Breathe deeply and slowly","Relax muscles during stretching","Perform after workout"]',
  'Коврик для упражнений',
  '80-100 ккал за растяжку'
);

-- Упражнение 11
INSERT INTO exercises (
  exercise_id, category, duration, difficulty,
  title_ru, description_ru, benefits_ru, instructions_ru, tips_ru, equipment_ru, calories_ru,
  title_en, description_en, benefits_en, instructions_en, tips_en, equipment_en, calories_en
) VALUES (
  '11',
  'Общее',
  '10-15 мин',
  'Средний',
  'Растяжка спины и плеч',
  'Наклоны вперед, растяжка грудных мышц, растяжка трицепсов. Удержание каждой позиции 20-30 секунд.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал',
  'Back and Shoulder Stretching',
  'Forward bends, chest muscle stretching, triceps stretching. Hold each position for 20-30 seconds.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал'
);

-- Упражнение 12
INSERT INTO exercises (
  exercise_id, category, duration, difficulty,
  title_ru, description_ru, benefits_ru, instructions_ru, tips_ru, equipment_ru, calories_ru,
  title_en, description_en, benefits_en, instructions_en, tips_en, equipment_en, calories_en
) VALUES (
  '12',
  'Общее',
  '10-15 мин',
  'Средний',
  'Йога для хоккеистов',
  'Комплекс асан для развития гибкости и баланса: поза воина, поза дерева, поза собаки мордой вниз.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал',
  'Yoga for Hockey Players',
  'Complex of asanas for developing flexibility and balance: warrior pose, tree pose, downward dog pose.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал'
);

-- Упражнение 13
INSERT INTO exercises (
  exercise_id, category, duration, difficulty,
  title_ru, description_ru, benefits_ru, instructions_ru, tips_ru, equipment_ru, calories_ru,
  title_en, description_en, benefits_en, instructions_en, tips_en, equipment_en, calories_en
) VALUES (
  '13',
  'Общее',
  '10-15 мин',
  'Средний',
  'Лестница координации',
  'Быстрые движения ногами через лестницу: боковые шаги, скрестные шаги, прыжки. 3 прохода каждого типа.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал',
  'Coordination Ladder',
  'Quick foot movements through ladder: lateral steps, crossover steps, jumps. 3 passes of each type.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал'
);

-- Упражнение 14
INSERT INTO exercises (
  exercise_id, category, duration, difficulty,
  title_ru, description_ru, benefits_ru, instructions_ru, tips_ru, equipment_ru, calories_ru,
  title_en, description_en, benefits_en, instructions_en, tips_en, equipment_en, calories_en
) VALUES (
  '14',
  'Общее',
  '10-15 мин',
  'Средний',
  'Жонглирование мячами',
  'Жонглирование 2-3 теннисными мячами для развития координации рук и глаз. Начинать с 1 мяча.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал',
  'Ball Juggling',
  'Juggling 2-3 tennis balls for developing hand-eye coordination. Start with 1 ball.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал'
);

-- Упражнение 15
INSERT INTO exercises (
  exercise_id, category, duration, difficulty,
  title_ru, description_ru, benefits_ru, instructions_ru, tips_ru, equipment_ru, calories_ru,
  title_en, description_en, benefits_en, instructions_en, tips_en, equipment_en, calories_en
) VALUES (
  '15',
  'Общее',
  '10-15 мин',
  'Средний',
  'Быстрые касания конусов',
  'Расставить 5-6 конусов и быстро касаться их рукой в случайном порядке. 3 подхода по 30 секунд.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал',
  'Quick Cone Touches',
  'Set up 5-6 cones and quickly touch them with hand in random order. 3 sets of 30 seconds.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал'
);

-- Упражнение 16
INSERT INTO exercises (
  exercise_id, category, duration, difficulty,
  title_ru, description_ru, benefits_ru, instructions_ru, tips_ru, equipment_ru, calories_ru,
  title_en, description_en, benefits_en, instructions_en, tips_en, equipment_en, calories_en
) VALUES (
  '16',
  'Общее',
  '10-15 мин',
  'Средний',
  'Гребля на тренажере',
  'Интервальная гребля: 2 минуты высокой интенсивности, 1 минута отдыха. 8-10 циклов для развития выносливости.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал',
  'Rowing Machine',
  'Interval rowing: 2 minutes high intensity, 1 minute rest. 8-10 cycles for endurance development.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал'
);

-- Упражнение 17
INSERT INTO exercises (
  exercise_id, category, duration, difficulty,
  title_ru, description_ru, benefits_ru, instructions_ru, tips_ru, equipment_ru, calories_ru,
  title_en, description_en, benefits_en, instructions_en, tips_en, equipment_en, calories_en
) VALUES (
  '17',
  'Общее',
  '10-15 мин',
  'Средний',
  'Скакалка с интервалами',
  'Чередование быстрых прыжков (30 сек) и медленных (30 сек). 20 минут для развития кардио-выносливости.',
  '["Развивает кардио-выносливость","Улучшает координацию движений","Укрепляет мышцы ног","Сжигает много калорий"]',
  '["Возьмите скакалку подходящей длины","30 секунд быстрых прыжков на максимальной скорости","30 секунд медленных прыжков для восстановления","Повторите цикл 20 раз","Завершите 2-минутной заминкой"]',
  '["Держите спину прямой","Работайте запястьями, а не руками","Приземляйтесь на носки","Начинайте с медленного темпа"]',
  'Скакалка',
  '200-300 ккал за тренировку',
  'Interval Jump Rope',
  'Alternating fast jumps (30 sec) and slow (30 sec). 20 minutes for cardio endurance development.',
  '["Develops cardio endurance","Improves movement coordination","Strengthens leg muscles","Burns many calories"]',
  '["Take a jump rope of suitable length","30 seconds of fast jumps at maximum speed","30 seconds of slow jumps for recovery","Repeat the cycle 20 times","Finish with 2-minute cool-down"]',
  '["Keep your back straight","Work with your wrists, not your arms","Land on your toes","Start with a slow pace"]',
  'Скакалка',
  '200-300 ккал за тренировку'
);

-- Упражнение 18
INSERT INTO exercises (
  exercise_id, category, duration, difficulty,
  title_ru, description_ru, benefits_ru, instructions_ru, tips_ru, equipment_ru, calories_ru,
  title_en, description_en, benefits_en, instructions_en, tips_en, equipment_en, calories_en
) VALUES (
  '18',
  'Общее',
  '10-15 мин',
  'Средний',
  'Бег по лестнице',
  'Бег вверх по лестнице с максимальной скоростью, спуск шагом. 10-15 подъемов для развития выносливости ног.',
  '["Развивает выносливость ног","Укрепляет мышцы бедер и ягодиц","Улучшает кардио-выносливость","Повышает силу ног"]',
  '["Найдите лестницу с 20-30 ступенями","Бегите вверх с максимальной скоростью","Спускайтесь шагом для восстановления","Выполните 10-15 подъемов","Отдыхайте 1-2 минуты между подъемами"]',
  '["Используйте всю стопу при подъеме","Держите спину прямой","Работайте руками активно","Не превышайте свои возможности"]',
  'Лестница',
  '250-350 ккал за тренировку',
  'Stair Running',
  'Running up stairs at maximum speed, walking down. 10-15 climbs for leg endurance development.',
  '["Develops leg endurance","Strengthens thigh and glute muscles","Improves cardio endurance","Increases leg strength"]',
  '["Find stairs with 20-30 steps","Run up at maximum speed","Walk down for recovery","Perform 10-15 climbs","Rest 1-2 minutes between climbs"]',
  '["Use your entire foot when climbing","Keep your back straight","Work your arms actively","Don''t exceed your capabilities"]',
  'Лестница',
  '250-350 ккал за тренировку'
);

-- Упражнение 19
INSERT INTO exercises (
  exercise_id, category, duration, difficulty,
  title_ru, description_ru, benefits_ru, instructions_ru, tips_ru, equipment_ru, calories_ru,
  title_en, description_en, benefits_en, instructions_en, tips_en, equipment_en, calories_en
) VALUES (
  '19',
  'Общее',
  '10-15 мин',
  'Средний',
  'Планка с движениями',
  'Удержание планки с поочередным подъемом рук и ног. 3 подхода по 45-60 секунд для укрепления кора.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал',
  'Plank with Movements',
  'Holding plank with alternating arm and leg lifts. 3 sets of 45-60 seconds for core strengthening.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал'
);

-- Упражнение 20
INSERT INTO exercises (
  exercise_id, category, duration, difficulty,
  title_ru, description_ru, benefits_ru, instructions_ru, tips_ru, equipment_ru, calories_ru,
  title_en, description_en, benefits_en, instructions_en, tips_en, equipment_en, calories_en
) VALUES (
  '20',
  'Общее',
  '10-15 мин',
  'Средний',
  'Бег с высоким подниманием колен',
  'Бег на месте с максимальным подниманием коленей к груди. 5 подходов по 2 минуты с отдыхом 1 минута.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал',
  'High Knee Running',
  'Running in place with maximum knee lifts to chest. 5 sets of 2 minutes with 1 minute rest.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал'
);

-- Упражнение 21
INSERT INTO exercises (
  exercise_id, category, duration, difficulty,
  title_ru, description_ru, benefits_ru, instructions_ru, tips_ru, equipment_ru, calories_ru,
  title_en, description_en, benefits_en, instructions_en, tips_en, equipment_en, calories_en
) VALUES (
  '21',
  'Общее',
  '10-15 мин',
  'Средний',
  'Прыжки в длину с места',
  'Прыжки вперед с максимальной дальностью, приземление на обе ноги. 5 подходов по 8-10 прыжков.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал',
  'Standing Long Jump',
  'Forward jumps with maximum distance, landing on both feet. 5 sets of 8-10 jumps.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал'
);

-- Упражнение 22
INSERT INTO exercises (
  exercise_id, category, duration, difficulty,
  title_ru, description_ru, benefits_ru, instructions_ru, tips_ru, equipment_ru, calories_ru,
  title_en, description_en, benefits_en, instructions_en, tips_en, equipment_en, calories_en
) VALUES (
  '22',
  'Общее',
  '10-15 мин',
  'Средний',
  'Быстрые отжимания',
  'Отжимания с максимальной скоростью, касание грудью пола. 4 подхода по 15-20 повторений.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал',
  'Fast Push-ups',
  'Push-ups at maximum speed, touching chest to floor. 4 sets of 15-20 repetitions.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал'
);

-- Упражнение 23
INSERT INTO exercises (
  exercise_id, category, duration, difficulty,
  title_ru, description_ru, benefits_ru, instructions_ru, tips_ru, equipment_ru, calories_ru,
  title_en, description_en, benefits_en, instructions_en, tips_en, equipment_en, calories_en
) VALUES (
  '23',
  'Общее',
  '10-15 мин',
  'Средний',
  'Прыжки через препятствия',
  'Прыжки через конусы или барьеры высотой 30-40 см. 3 прохода по 10 препятствий.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал',
  'Obstacle Jumps',
  'Jumping over cones or barriers 30-40 cm high. 3 passes of 10 obstacles.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал'
);

-- Упражнение 24
INSERT INTO exercises (
  exercise_id, category, duration, difficulty,
  title_ru, description_ru, benefits_ru, instructions_ru, tips_ru, equipment_ru, calories_ru,
  title_en, description_en, benefits_en, instructions_en, tips_en, equipment_en, calories_en
) VALUES (
  '24',
  'Общее',
  '10-15 мин',
  'Средний',
  'Быстрые приседания',
  'Приседания с максимальной скоростью, бедра параллельно полу. 4 подхода по 20-25 повторений.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал',
  'Fast Squats',
  'Squats at maximum speed, thighs parallel to floor. 4 sets of 20-25 repetitions.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал'
);

-- Упражнение 25
INSERT INTO exercises (
  exercise_id, category, duration, difficulty,
  title_ru, description_ru, benefits_ru, instructions_ru, tips_ru, equipment_ru, calories_ru,
  title_en, description_en, benefits_en, instructions_en, tips_en, equipment_en, calories_en
) VALUES (
  '25',
  'Общее',
  '10-15 мин',
  'Средний',
  'Броски набивного мяча',
  'Броски тяжелого мяча (5-8 кг) от груди с максимальной силой. 3 подхода по 15 бросков.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал',
  'Medicine Ball Throws',
  'Throwing heavy ball (5-8 kg) from chest with maximum force. 3 sets of 15 throws.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал'
);

-- Упражнение 26
INSERT INTO exercises (
  exercise_id, category, duration, difficulty,
  title_ru, description_ru, benefits_ru, instructions_ru, tips_ru, equipment_ru, calories_ru,
  title_en, description_en, benefits_en, instructions_en, tips_en, equipment_en, calories_en
) VALUES (
  '26',
  'Общее',
  '10-15 мин',
  'Средний',
  'Разминка голеностопа',
  'Круговые движения стопами, сгибание-разгибание пальцев ног. 2-3 минуты для каждой ноги.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал',
  'Ankle Warm-up',
  'Circular foot movements, toe flexion-extension. 2-3 minutes for each foot.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал'
);

-- Упражнение 27
INSERT INTO exercises (
  exercise_id, category, duration, difficulty,
  title_ru, description_ru, benefits_ru, instructions_ru, tips_ru, equipment_ru, calories_ru,
  title_en, description_en, benefits_en, instructions_en, tips_en, equipment_en, calories_en
) VALUES (
  '27',
  'Общее',
  '10-15 мин',
  'Средний',
  'Разминка шеи',
  'Плавные повороты головы, наклоны вперед-назад, круговые движения. 2-3 минуты.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал',
  'Neck Warm-up',
  'Smooth head turns, forward-backward bends, circular movements. 2-3 minutes.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал'
);

-- Упражнение 28
INSERT INTO exercises (
  exercise_id, category, duration, difficulty,
  title_ru, description_ru, benefits_ru, instructions_ru, tips_ru, equipment_ru, calories_ru,
  title_en, description_en, benefits_en, instructions_en, tips_en, equipment_en, calories_en
) VALUES (
  '28',
  'Общее',
  '10-15 мин',
  'Средний',
  'Разминка запястий',
  'Круговые движения кистями, сгибание-разгибание пальцев. 2-3 минуты для каждой руки.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал',
  'Wrist Warm-up',
  'Circular hand movements, finger flexion-extension. 2-3 minutes for each hand.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал'
);

-- Упражнение 29
INSERT INTO exercises (
  exercise_id, category, duration, difficulty,
  title_ru, description_ru, benefits_ru, instructions_ru, tips_ru, equipment_ru, calories_ru,
  title_en, description_en, benefits_en, instructions_en, tips_en, equipment_en, calories_en
) VALUES (
  '29',
  'Общее',
  '10-15 мин',
  'Средний',
  'Разминка коленей',
  'Полуприседания, круговые движения коленями, легкие прыжки на месте. 3-4 минуты.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал',
  'Knee Warm-up',
  'Half-squats, circular knee movements, light jumps in place. 3-4 minutes.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал'
);

-- Упражнение 30
INSERT INTO exercises (
  exercise_id, category, duration, difficulty,
  title_ru, description_ru, benefits_ru, instructions_ru, tips_ru, equipment_ru, calories_ru,
  title_en, description_en, benefits_en, instructions_en, tips_en, equipment_en, calories_en
) VALUES (
  '30',
  'Общее',
  '10-15 мин',
  'Средний',
  'Разминка тазобедренных суставов',
  'Круговые движения бедрами, махи ногами в стороны, легкие выпады. 4-5 минут.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал',
  'Hip Joint Warm-up',
  'Circular hip movements, leg swings to sides, light lunges. 4-5 minutes.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал'
);

-- Упражнение 31
INSERT INTO exercises (
  exercise_id, category, duration, difficulty,
  title_ru, description_ru, benefits_ru, instructions_ru, tips_ru, equipment_ru, calories_ru,
  title_en, description_en, benefits_en, instructions_en, tips_en, equipment_en, calories_en
) VALUES (
  '31',
  'Общее',
  '10-15 мин',
  'Средний',
  'Растяжка паха',
  'Бабочка - сидя на полу, соединить стопы и наклониться вперед. Удержание 30-45 секунд.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал',
  'Groin Stretching',
  'Butterfly - sitting on floor, connect feet and bend forward. Hold for 30-45 seconds.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал'
);

-- Упражнение 32
INSERT INTO exercises (
  exercise_id, category, duration, difficulty,
  title_ru, description_ru, benefits_ru, instructions_ru, tips_ru, equipment_ru, calories_ru,
  title_en, description_en, benefits_en, instructions_en, tips_en, equipment_en, calories_en
) VALUES (
  '32',
  'Общее',
  '10-15 мин',
  'Средний',
  'Растяжка подколенных сухожилий',
  'Наклоны вперед к прямым ногам, удержание 30 секунд. 3 подхода по 15 секунд.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал',
  'Hamstring Stretching',
  'Forward bends to straight legs, hold for 30 seconds. 3 sets of 15 seconds.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал'
);

-- Упражнение 33
INSERT INTO exercises (
  exercise_id, category, duration, difficulty,
  title_ru, description_ru, benefits_ru, instructions_ru, tips_ru, equipment_ru, calories_ru,
  title_en, description_en, benefits_en, instructions_en, tips_en, equipment_en, calories_en
) VALUES (
  '33',
  'Общее',
  '10-15 мин',
  'Средний',
  'Растяжка икроножных мышц',
  'Выпады с упором на стену, растяжка задней поверхности голени. 20 секунд на каждую ногу.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал',
  'Calf Muscle Stretching',
  'Lunges with wall support, stretching back of shin. 20 seconds for each leg.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал'
);

-- Упражнение 34
INSERT INTO exercises (
  exercise_id, category, duration, difficulty,
  title_ru, description_ru, benefits_ru, instructions_ru, tips_ru, equipment_ru, calories_ru,
  title_en, description_en, benefits_en, instructions_en, tips_en, equipment_en, calories_en
) VALUES (
  '34',
  'Общее',
  '10-15 мин',
  'Средний',
  'Растяжка грудных мышц',
  'Растяжка у стены с отведением рук назад. Удержание 30 секунд, 3 подхода.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал',
  'Chest Muscle Stretching',
  'Wall stretching with arms pulled back. Hold for 30 seconds, 3 sets.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал'
);

-- Упражнение 35
INSERT INTO exercises (
  exercise_id, category, duration, difficulty,
  title_ru, description_ru, benefits_ru, instructions_ru, tips_ru, equipment_ru, calories_ru,
  title_en, description_en, benefits_en, instructions_en, tips_en, equipment_en, calories_en
) VALUES (
  '35',
  'Общее',
  '10-15 мин',
  'Средний',
  'Растяжка трицепсов',
  'Заведение руки за голову, растяжка задней поверхности плеча. 20 секунд на каждую руку.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал',
  'Triceps Stretching',
  'Bringing arm behind head, stretching back of shoulder. 20 seconds for each arm.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал'
);

-- Упражнение 36
INSERT INTO exercises (
  exercise_id, category, duration, difficulty,
  title_ru, description_ru, benefits_ru, instructions_ru, tips_ru, equipment_ru, calories_ru,
  title_en, description_en, benefits_en, instructions_en, tips_en, equipment_en, calories_en
) VALUES (
  '36',
  'Общее',
  '10-15 мин',
  'Средний',
  'Змейка между конусами',
  'Бег змейкой между конусами, расставленными в линию. 5 проходов с максимальной скоростью.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал',
  'Cone Slalom',
  'Running slalom between cones placed in line. 5 passes at maximum speed.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал'
);

-- Упражнение 37
INSERT INTO exercises (
  exercise_id, category, duration, difficulty,
  title_ru, description_ru, benefits_ru, instructions_ru, tips_ru, equipment_ru, calories_ru,
  title_en, description_en, benefits_en, instructions_en, tips_en, equipment_en, calories_en
) VALUES (
  '37',
  'Общее',
  '10-15 мин',
  'Средний',
  'Быстрые касания ногами',
  'Быстрые касания конусов ногами в случайном порядке. 3 подхода по 45 секунд.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал',
  'Quick Foot Touches',
  'Quick touches of cones with feet in random order. 3 sets of 45 seconds.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал'
);

-- Упражнение 38
INSERT INTO exercises (
  exercise_id, category, duration, difficulty,
  title_ru, description_ru, benefits_ru, instructions_ru, tips_ru, equipment_ru, calories_ru,
  title_en, description_en, benefits_en, instructions_en, tips_en, equipment_en, calories_en
) VALUES (
  '38',
  'Общее',
  '10-15 мин',
  'Средний',
  'Прыжки с поворотами',
  'Прыжки на месте с поворотами на 90-180 градусов. 3 подхода по 20 прыжков.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал',
  'Jumps with Turns',
  'Jumps in place with 90-180 degree turns. 3 sets of 20 jumps.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал'
);

-- Упражнение 39
INSERT INTO exercises (
  exercise_id, category, duration, difficulty,
  title_ru, description_ru, benefits_ru, instructions_ru, tips_ru, equipment_ru, calories_ru,
  title_en, description_en, benefits_en, instructions_en, tips_en, equipment_en, calories_en
) VALUES (
  '39',
  'Общее',
  '10-15 мин',
  'Средний',
  'Быстрые передачи мяча',
  'Передачи теннисного мяча между руками с максимальной скоростью. 3 подхода по 1 минуте.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал',
  'Fast Ball Passing',
  'Passing tennis ball between hands at maximum speed. 3 sets of 1 minute.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал'
);

-- Упражнение 40
INSERT INTO exercises (
  exercise_id, category, duration, difficulty,
  title_ru, description_ru, benefits_ru, instructions_ru, tips_ru, equipment_ru, calories_ru,
  title_en, description_en, benefits_en, instructions_en, tips_en, equipment_en, calories_en
) VALUES (
  '40',
  'Общее',
  '10-15 мин',
  'Средний',
  'Бег спиной вперед',
  'Бег спиной вперед с быстрыми поворотами по сигналу. 5 подходов по 30 секунд.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал',
  'Backward Running',
  'Running backward with quick turns on signal. 5 sets of 30 seconds.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал'
);

-- Упражнение 41
INSERT INTO exercises (
  exercise_id, category, duration, difficulty,
  title_ru, description_ru, benefits_ru, instructions_ru, tips_ru, equipment_ru, calories_ru,
  title_en, description_en, benefits_en, instructions_en, tips_en, equipment_en, calories_en
) VALUES (
  '41',
  'Общее',
  '10-15 мин',
  'Средний',
  'Приседания с весом',
  'Приседания с гантелями или штангой, бедра параллельно полу. 4 подхода по 12-15 повторений.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал',
  'Weighted Squats',
  'Squats with dumbbells or barbell, thighs parallel to floor. 4 sets of 12-15 repetitions.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал'
);

-- Упражнение 42
INSERT INTO exercises (
  exercise_id, category, duration, difficulty,
  title_ru, description_ru, benefits_ru, instructions_ru, tips_ru, equipment_ru, calories_ru,
  title_en, description_en, benefits_en, instructions_en, tips_en, equipment_en, calories_en
) VALUES (
  '42',
  'Общее',
  '10-15 мин',
  'Средний',
  'Становая тяга',
  'Подъем штанги с пола до уровня бедер с прямой спиной. 3 подхода по 8-10 повторений.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал',
  'Deadlift',
  'Lifting barbell from floor to hip level with straight back. 3 sets of 8-10 repetitions.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал'
);

-- Упражнение 43
INSERT INTO exercises (
  exercise_id, category, duration, difficulty,
  title_ru, description_ru, benefits_ru, instructions_ru, tips_ru, equipment_ru, calories_ru,
  title_en, description_en, benefits_en, instructions_en, tips_en, equipment_en, calories_en
) VALUES (
  '43',
  'Общее',
  '10-15 мин',
  'Средний',
  'Жим лежа',
  'Жим штанги от груди лежа на скамье. 4 подхода по 8-12 повторений.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал',
  'Bench Press',
  'Pressing barbell from chest while lying on bench. 4 sets of 8-12 repetitions.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал'
);

-- Упражнение 44
INSERT INTO exercises (
  exercise_id, category, duration, difficulty,
  title_ru, description_ru, benefits_ru, instructions_ru, tips_ru, equipment_ru, calories_ru,
  title_en, description_en, benefits_en, instructions_en, tips_en, equipment_en, calories_en
) VALUES (
  '44',
  'Общее',
  '10-15 мин',
  'Средний',
  'Подтягивания',
  'Подтягивания на перекладине до касания подбородком. 3 подхода по 8-12 повторений.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал',
  'Pull-ups',
  'Pull-ups on bar until chin touches. 3 sets of 8-12 repetitions.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал'
);

-- Упражнение 45
INSERT INTO exercises (
  exercise_id, category, duration, difficulty,
  title_ru, description_ru, benefits_ru, instructions_ru, tips_ru, equipment_ru, calories_ru,
  title_en, description_en, benefits_en, instructions_en, tips_en, equipment_en, calories_en
) VALUES (
  '45',
  'Общее',
  '10-15 мин',
  'Средний',
  'Отжимания на брусьях',
  'Отжимания на параллельных брусьях с опусканием до угла 90 градусов. 3 подхода по 10-15 повторений.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал',
  'Dips on Bars',
  'Push-ups on parallel bars with 90-degree descent. 3 sets of 10-15 repetitions.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал'
);

-- Упражнение 46
INSERT INTO exercises (
  exercise_id, category, duration, difficulty,
  title_ru, description_ru, benefits_ru, instructions_ru, tips_ru, equipment_ru, calories_ru,
  title_en, description_en, benefits_en, instructions_en, tips_en, equipment_en, calories_en
) VALUES (
  '46',
  'Общее',
  '10-15 мин',
  'Средний',
  'Стойка на одной ноге',
  'Удержание равновесия на одной ноге с закрытыми глазами. 3 подхода по 30 секунд на каждую ногу.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал',
  'Single Leg Stand',
  'Holding balance on one leg with eyes closed. 3 sets of 30 seconds each leg.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал'
);

-- Упражнение 47
INSERT INTO exercises (
  exercise_id, category, duration, difficulty,
  title_ru, description_ru, benefits_ru, instructions_ru, tips_ru, equipment_ru, calories_ru,
  title_en, description_en, benefits_en, instructions_en, tips_en, equipment_en, calories_en
) VALUES (
  '47',
  'Общее',
  '10-15 мин',
  'Средний',
  'Планка на одной ноге',
  'Удержание планки с подъемом одной ноги. 3 подхода по 30 секунд на каждую ногу.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал',
  'Single Leg Plank',
  'Holding plank with one leg lifted. 3 sets of 30 seconds each leg.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал'
);

-- Упражнение 48
INSERT INTO exercises (
  exercise_id, category, duration, difficulty,
  title_ru, description_ru, benefits_ru, instructions_ru, tips_ru, equipment_ru, calories_ru,
  title_en, description_en, benefits_en, instructions_en, tips_en, equipment_en, calories_en
) VALUES (
  '48',
  'Общее',
  '10-15 мин',
  'Средний',
  'Приседания на одной ноге',
  'Приседания на одной ноге с вытянутой вперед другой ногой. 3 подхода по 8-10 повторений на каждую ногу.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал',
  'Single Leg Squats',
  'Squats on one leg with other leg extended forward. 3 sets of 8-10 repetitions each leg.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал'
);

-- Упражнение 49
INSERT INTO exercises (
  exercise_id, category, duration, difficulty,
  title_ru, description_ru, benefits_ru, instructions_ru, tips_ru, equipment_ru, calories_ru,
  title_en, description_en, benefits_en, instructions_en, tips_en, equipment_en, calories_en
) VALUES (
  '49',
  'Общее',
  '10-15 мин',
  'Средний',
  'Босу-мяч упражнения',
  'Упражнения на нестабильной поверхности для развития баланса. 15-20 минут различных движений.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал',
  'BOSU Ball Exercises',
  'Exercises on unstable surface for balance development. 15-20 minutes of various movements.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал'
);

-- Упражнение 50
INSERT INTO exercises (
  exercise_id, category, duration, difficulty,
  title_ru, description_ru, benefits_ru, instructions_ru, tips_ru, equipment_ru, calories_ru,
  title_en, description_en, benefits_en, instructions_en, tips_en, equipment_en, calories_en
) VALUES (
  '50',
  'Общее',
  '10-15 мин',
  'Средний',
  'Йога-баланс',
  'Поза дерева, поза воина III, поза орла для развития баланса. Удержание каждой позы 30-60 секунд.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал',
  'Balance Yoga',
  'Tree pose, warrior III pose, eagle pose for balance development. Hold each pose for 30-60 seconds.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал'
);

-- Упражнение 51
INSERT INTO exercises (
  exercise_id, category, duration, difficulty,
  title_ru, description_ru, benefits_ru, instructions_ru, tips_ru, equipment_ru, calories_ru,
  title_en, description_en, benefits_en, instructions_en, tips_en, equipment_en, calories_en
) VALUES (
  '51',
  'Общее',
  '10-15 мин',
  'Средний',
  'Ходьба по бревну',
  'Ходьба по узкому бревну или доске для развития равновесия. 5 проходов туда-обратно.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал',
  'Log Walking',
  'Walking on narrow log or board for balance development. 5 passes back and forth.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал'
);

-- Упражнение 52
INSERT INTO exercises (
  exercise_id, category, duration, difficulty,
  title_ru, description_ru, benefits_ru, instructions_ru, tips_ru, equipment_ru, calories_ru,
  title_en, description_en, benefits_en, instructions_en, tips_en, equipment_en, calories_en
) VALUES (
  '52',
  'Общее',
  '10-15 мин',
  'Средний',
  'Стойка на руках у стены',
  'Стойка на руках с опорой на стену для развития баланса верхней части тела. 3 подхода по 20 секунд.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал',
  'Wall Handstand',
  'Handstand with wall support for upper body balance development. 3 sets of 20 seconds.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал'
);

-- Упражнение 53
INSERT INTO exercises (
  exercise_id, category, duration, difficulty,
  title_ru, description_ru, benefits_ru, instructions_ru, tips_ru, equipment_ru, calories_ru,
  title_en, description_en, benefits_en, instructions_en, tips_en, equipment_en, calories_en
) VALUES (
  '53',
  'Общее',
  '10-15 мин',
  'Средний',
  'Фартлек',
  'Бег с переменной интенсивностью: быстрый бег 2 минуты, медленный 1 минута. 30 минут общей работы.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал',
  'Fartlek',
  'Running with variable intensity: fast run 2 minutes, slow 1 minute. 30 minutes total work.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал'
);

-- Упражнение 54
INSERT INTO exercises (
  exercise_id, category, duration, difficulty,
  title_ru, description_ru, benefits_ru, instructions_ru, tips_ru, equipment_ru, calories_ru,
  title_en, description_en, benefits_en, instructions_en, tips_en, equipment_en, calories_en
) VALUES (
  '54',
  'Общее',
  '10-15 мин',
  'Средний',
  'Повторные спринты',
  'Спринты на 100 метров с отдыхом 2-3 минуты. 6-8 повторений для развития скоростной выносливости.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал',
  'Repeat Sprints',
  '100-meter sprints with 2-3 minutes rest. 6-8 repetitions for speed endurance development.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал'
);

-- Упражнение 55
INSERT INTO exercises (
  exercise_id, category, duration, difficulty,
  title_ru, description_ru, benefits_ru, instructions_ru, tips_ru, equipment_ru, calories_ru,
  title_en, description_en, benefits_en, instructions_en, tips_en, equipment_en, calories_en
) VALUES (
  '55',
  'Общее',
  '10-15 мин',
  'Средний',
  'Интервалы на велосипеде',
  '30 секунд максимальной нагрузки, 90 секунд восстановления. 20 циклов для развития скоростной выносливости.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал',
  'Bike Intervals',
  '30 seconds maximum load, 90 seconds recovery. 20 cycles for speed endurance development.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал'
);

-- Упражнение 56
INSERT INTO exercises (
  exercise_id, category, duration, difficulty,
  title_ru, description_ru, benefits_ru, instructions_ru, tips_ru, equipment_ru, calories_ru,
  title_en, description_en, benefits_en, instructions_en, tips_en, equipment_en, calories_en
) VALUES (
  '56',
  'Общее',
  '10-15 мин',
  'Средний',
  'Бег по холмам',
  'Бег вверх по холму с максимальной скоростью, спуск трусцой. 8-10 подъемов.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал',
  'Hill Running',
  'Running up hill at maximum speed, jogging down. 8-10 climbs.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал'
);

-- Упражнение 57
INSERT INTO exercises (
  exercise_id, category, duration, difficulty,
  title_ru, description_ru, benefits_ru, instructions_ru, tips_ru, equipment_ru, calories_ru,
  title_en, description_en, benefits_en, instructions_en, tips_en, equipment_en, calories_en
) VALUES (
  '57',
  'Общее',
  '10-15 мин',
  'Средний',
  'Плиометрические круги',
  'Круг из 5-6 плиометрических упражнений без отдыха. 4-5 кругов с отдыхом 2 минуты между ними.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал',
  'Plyometric Circuits',
  'Circuit of 5-6 plyometric exercises without rest. 4-5 circuits with 2 minutes rest between.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал'
);

-- Упражнение 58
INSERT INTO exercises (
  exercise_id, category, duration, difficulty,
  title_ru, description_ru, benefits_ru, instructions_ru, tips_ru, equipment_ru, calories_ru,
  title_en, description_en, benefits_en, instructions_en, tips_en, equipment_en, calories_en
) VALUES (
  '58',
  'Общее',
  '10-15 мин',
  'Средний',
  'Легкая растяжка',
  'Мягкая растяжка всех основных групп мышц после тренировки. 15-20 минут для ускорения восстановления.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал',
  'Light Stretching',
  'Gentle stretching of all major muscle groups after workout. 15-20 minutes for recovery acceleration.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал'
);

-- Упражнение 59
INSERT INTO exercises (
  exercise_id, category, duration, difficulty,
  title_ru, description_ru, benefits_ru, instructions_ru, tips_ru, equipment_ru, calories_ru,
  title_en, description_en, benefits_en, instructions_en, tips_en, equipment_en, calories_en
) VALUES (
  '59',
  'Общее',
  '10-15 мин',
  'Средний',
  'Фоам-роллинг',
  'Массаж мышц с помощью ролика для снятия напряжения. 10-15 минут на основные группы мышц.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал',
  'Foam Rolling',
  'Muscle massage with roller for tension relief. 10-15 minutes on major muscle groups.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал'
);

-- Упражнение 60
INSERT INTO exercises (
  exercise_id, category, duration, difficulty,
  title_ru, description_ru, benefits_ru, instructions_ru, tips_ru, equipment_ru, calories_ru,
  title_en, description_en, benefits_en, instructions_en, tips_en, equipment_en, calories_en
) VALUES (
  '60',
  'Общее',
  '10-15 мин',
  'Средний',
  'Легкий бег',
  'Бег трусцой в низком темпе для активного восстановления. 15-20 минут.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал',
  'Light Running',
  'Jogging at low pace for active recovery. 15-20 minutes.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал'
);

-- Упражнение 61
INSERT INTO exercises (
  exercise_id, category, duration, difficulty,
  title_ru, description_ru, benefits_ru, instructions_ru, tips_ru, equipment_ru, calories_ru,
  title_en, description_en, benefits_en, instructions_en, tips_en, equipment_en, calories_en
) VALUES (
  '61',
  'Общее',
  '10-15 мин',
  'Средний',
  'Плавание',
  'Легкое плавание в бассейне для расслабления мышц и восстановления. 20-30 минут.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал',
  'Swimming',
  'Light swimming in pool for muscle relaxation and recovery. 20-30 minutes.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал'
);

-- Упражнение 62
INSERT INTO exercises (
  exercise_id, category, duration, difficulty,
  title_ru, description_ru, benefits_ru, instructions_ru, tips_ru, equipment_ru, calories_ru,
  title_en, description_en, benefits_en, instructions_en, tips_en, equipment_en, calories_en
) VALUES (
  '62',
  'Общее',
  '10-15 мин',
  'Средний',
  'Велосипед восстановления',
  'Легкая езда на велосипеде в низком темпе для активного восстановления. 20-25 минут.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал',
  'Recovery Cycling',
  'Light cycling at low pace for active recovery. 20-25 minutes.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал'
);

-- Упражнение 63
INSERT INTO exercises (
  exercise_id, category, duration, difficulty,
  title_ru, description_ru, benefits_ru, instructions_ru, tips_ru, equipment_ru, calories_ru,
  title_en, description_en, benefits_en, instructions_en, tips_en, equipment_en, calories_en
) VALUES (
  '63',
  'Общее',
  '10-15 мин',
  'Средний',
  'Йога восстановления',
  'Мягкие асаны для расслабления мышц и ускорения восстановления. 20 минут.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал',
  'Recovery Yoga',
  'Gentle asanas for muscle relaxation and recovery acceleration. 20 minutes.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал'
);

-- Упражнение 64
INSERT INTO exercises (
  exercise_id, category, duration, difficulty,
  title_ru, description_ru, benefits_ru, instructions_ru, tips_ru, equipment_ru, calories_ru,
  title_en, description_en, benefits_en, instructions_en, tips_en, equipment_en, calories_en
) VALUES (
  '64',
  'Общее',
  '10-15 мин',
  'Средний',
  'Растяжка с резинкой',
  'Упражнения на растяжку с использованием резиновой ленты',
  '["Улучшает гибкость суставов","Укрепляет связки","Снимает мышечное напряжение","Повышает диапазон движений"]',
  '["Выберите подходящую резинку","Выполняйте медленные движения","Удерживайте растяжку 20-30 секунд","Повторите каждое упражнение 3-5 раз"]',
  '["Начинайте с легкой резинки","Не допускайте боли","Дышите равномерно","Постепенно увеличивайте сопротивление"]',
  'Резиновая лента',
  '35-55 ккал',
  'Stretching with Resistance Band',
  'Stretching exercises using a resistance band',
  '["Improves joint flexibility","Strengthens ligaments","Relieves muscle tension","Increases range of motion"]',
  '["Choose a suitable resistance band","Perform slow movements","Hold each stretch for 20-30 seconds","Repeat each exercise 3-5 times"]',
  '["Start with a light resistance band","Don''t allow pain","Breathe evenly","Gradually increase resistance"]',
  'Резиновая лента',
  '35-55 ккал'
);

-- Упражнение 65
INSERT INTO exercises (
  exercise_id, category, duration, difficulty,
  title_ru, description_ru, benefits_ru, instructions_ru, tips_ru, equipment_ru, calories_ru,
  title_en, description_en, benefits_en, instructions_en, tips_en, equipment_en, calories_en
) VALUES (
  '65',
  'Общее',
  '10-15 мин',
  'Средний',
  'Контрастный душ',
  'Чередование горячей и холодной воды для улучшения кровообращения и восстановления. 5-7 минут.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал',
  'Contrast Shower',
  'Alternating hot and cold water for improved circulation and recovery. 5-7 minutes.',
  '[]',
  '[]',
  '[]',
  'Не требуется',
  '100-200 ккал'
);


-- Проверяем количество добавленных упражнений
SELECT COUNT(*) as total_exercises FROM exercises;
