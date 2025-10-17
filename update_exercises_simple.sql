-- Простое обновление упражнений без проверки
-- Выполните этот скрипт в Supabase SQL Editor

-- Упражнение 11: Растяжка спины и плеч
UPDATE exercises SET
  benefits_ru = '["Улучшает гибкость позвоночника", "Снимает напряжение в плечах", "Предотвращает травмы спины", "Улучшает осанку"]',
  benefits_en = '["Improves spine flexibility", "Relieves shoulder tension", "Prevents back injuries", "Improves posture"]',
  instructions_ru = '["Встаньте прямо, ноги на ширине плеч", "Поднимите правую руку вверх и наклонитесь влево", "Задержитесь на 15-20 секунд", "Повторите для левой стороны", "Выполните 3-5 повторений для каждой стороны"]',
  instructions_en = '["Stand straight, feet shoulder-width apart", "Raise your right arm up and lean to the left", "Hold for 15-20 seconds", "Repeat for the left side", "Perform 3-5 repetitions for each side"]',
  tips_ru = '["Дышите глубоко во время растяжки", "Не делайте резких движений", "Чувствуйте растяжение, но не боль", "Выполняйте ежедневно для лучшего результата"]',
  tips_en = '["Breathe deeply during stretching", "Avoid sudden movements", "Feel the stretch but not pain", "Perform daily for better results"]'
WHERE exercise_id = '11';

-- Упражнение 12: Йога для хоккеистов
UPDATE exercises SET
  benefits_ru = '["Улучшает баланс и координацию", "Снимает стресс", "Укрепляет мышцы кора", "Повышает концентрацию"]',
  benefits_en = '["Improves balance and coordination", "Relieves stress", "Strengthens core muscles", "Increases concentration"]',
  instructions_ru = '["Начните в позе горы (тадасана)", "Перейдите в позу воина III", "Выполните позу дерева", "Завершите позой ребенка", "Повторите последовательность 3-5 раз"]',
  instructions_en = '["Start in mountain pose (tadasana)", "Transition to warrior III pose", "Perform tree pose", "Finish with child pose", "Repeat the sequence 3-5 times"]',
  tips_ru = '["Сосредоточьтесь на дыхании", "Двигайтесь медленно и плавно", "Не форсируйте позы", "Используйте коврик для йоги"]',
  tips_en = '["Focus on breathing", "Move slowly and smoothly", "Don''t force poses", "Use a yoga mat"]'
WHERE exercise_id = '12';

-- Упражнение 13: Лестница координации
UPDATE exercises SET
  benefits_ru = '["Развивает координацию движений", "Улучшает ловкость", "Повышает скорость реакции", "Укрепляет мышцы ног"]',
  benefits_en = '["Develops movement coordination", "Improves agility", "Increases reaction speed", "Strengthens leg muscles"]',
  instructions_ru = '["Поставьте лестницу координации на пол", "Начните с простого шага в каждую ячейку", "Постепенно увеличивайте скорость", "Добавьте боковые движения", "Выполните 3-5 подходов по 2-3 минуты"]',
  instructions_en = '["Place coordination ladder on the floor", "Start with simple step in each cell", "Gradually increase speed", "Add lateral movements", "Perform 3-5 sets of 2-3 minutes"]',
  tips_ru = '["Начинайте медленно, затем ускоряйтесь", "Следите за правильной техникой", "Отдыхайте между подходами", "Используйте разные варианты движений"]',
  tips_en = '["Start slowly, then accelerate", "Watch for proper technique", "Rest between sets", "Use different movement variations"]'
WHERE exercise_id = '13';

-- Упражнение 14: Жонглирование мячами
UPDATE exercises SET
  benefits_ru = '["Развивает координацию рук и глаз", "Улучшает концентрацию", "Повышает ловкость", "Тренирует периферическое зрение"]',
  benefits_en = '["Develops hand-eye coordination", "Improves concentration", "Increases agility", "Trains peripheral vision"]',
  instructions_ru = '["Начните с одного мяча", "Подбрасывайте мяч одной рукой", "Когда освоитесь, добавьте второй мяч", "Попробуйте жонглировать двумя мячами", "Постепенно добавляйте третий мяч"]',
  instructions_en = '["Start with one ball", "Toss the ball with one hand", "When comfortable, add a second ball", "Try juggling with two balls", "Gradually add a third ball"]',
  tips_ru = '["Начинайте с мягких мячей", "Практикуйтесь регулярно", "Не расстраивайтесь из-за ошибок", "Сосредоточьтесь на ритме"]',
  tips_en = '["Start with soft balls", "Practice regularly", "Don''t get discouraged by mistakes", "Focus on rhythm"]'
WHERE exercise_id = '14';

-- Упражнение 15: Быстрые касания конусов
UPDATE exercises SET
  benefits_ru = '["Развивает скорость реакции", "Улучшает координацию", "Повышает ловкость", "Тренирует периферическое зрение"]',
  benefits_en = '["Develops reaction speed", "Improves coordination", "Increases agility", "Trains peripheral vision"]',
  instructions_ru = '["Расставьте конусы на расстоянии 1-2 метра", "Быстро касайтесь каждого конуса рукой", "Меняйте направление движения", "Увеличивайте скорость постепенно", "Выполните 3-5 подходов по 30 секунд"]',
  instructions_en = '["Place cones 1-2 meters apart", "Quickly touch each cone with your hand", "Change direction of movement", "Gradually increase speed", "Perform 3-5 sets of 30 seconds"]',
  tips_ru = '["Следите за правильной техникой", "Не торопитесь в начале", "Отдыхайте между подходами", "Используйте разные паттерны движения"]',
  tips_en = '["Watch for proper technique", "Don''t rush at the beginning", "Rest between sets", "Use different movement patterns"]'
WHERE exercise_id = '15';

-- Упражнение 16: Гребля на тренажере
UPDATE exercises SET
  benefits_ru = '["Развивает выносливость", "Укрепляет мышцы спины и рук", "Улучшает сердечно-сосудистую систему", "Сжигает калории"]',
  benefits_en = '["Develops endurance", "Strengthens back and arm muscles", "Improves cardiovascular system", "Burns calories"]',
  instructions_ru = '["Сядьте на тренажер для гребли", "Зафиксируйте ноги на подставках", "Возьмите рукоятку широким хватом", "Начните движение, отталкиваясь ногами", "Подтяните рукоятку к груди", "Вернитесь в исходное положение", "Выполните 3-4 подхода по 5-10 минут"]',
  instructions_en = '["Sit on the rowing machine", "Secure your feet on the footrests", "Grab the handle with a wide grip", "Start the movement by pushing with your legs", "Pull the handle to your chest", "Return to starting position", "Perform 3-4 sets of 5-10 minutes"]',
  tips_ru = '["Следите за правильной техникой", "Не округляйте спину", "Дышите ритмично", "Начинайте с легкого веса"]',
  tips_en = '["Watch for proper technique", "Don''t round your back", "Breathe rhythmically", "Start with light weight"]'
WHERE exercise_id = '16';

-- Упражнение 19: Планка с движениями
UPDATE exercises SET
  benefits_ru = '["Укрепляет мышцы кора", "Развивает стабильность", "Улучшает баланс", "Повышает выносливость"]',
  benefits_en = '["Strengthens core muscles", "Develops stability", "Improves balance", "Increases endurance"]',
  instructions_ru = '["Примите положение планки на предплечьях", "Поднимите правую руку и коснитесь левого плеча", "Верните руку в исходное положение", "Повторите левой рукой", "Добавьте подъемы ног", "Выполните 3-4 подхода по 30-60 секунд"]',
  instructions_en = '["Assume forearm plank position", "Lift your right hand and touch your left shoulder", "Return your hand to starting position", "Repeat with your left hand", "Add leg lifts", "Perform 3-4 sets of 30-60 seconds"]',
  tips_ru = '["Держите тело прямым", "Не раскачивайтесь из стороны в сторону", "Дышите ровно", "Начинайте с простых движений"]',
  tips_en = '["Keep your body straight", "Don''t sway from side to side", "Breathe evenly", "Start with simple movements"]'
WHERE exercise_id = '19';

-- Упражнение 20: Бег с высоким подниманием колен
UPDATE exercises SET
  benefits_ru = '["Развивает взрывную силу ног", "Улучшает координацию", "Повышает скорость бега", "Укрепляет мышцы бедер"]',
  benefits_en = '["Develops explosive leg power", "Improves coordination", "Increases running speed", "Strengthens thigh muscles"]',
  instructions_ru = '["Встаньте прямо, ноги на ширине плеч", "Начните бег на месте", "Поднимайте колени как можно выше", "Работайте руками активно", "Увеличивайте скорость постепенно", "Выполните 3-4 подхода по 30-60 секунд"]',
  instructions_en = '["Stand straight, feet shoulder-width apart", "Start running in place", "Lift your knees as high as possible", "Work your arms actively", "Gradually increase speed", "Perform 3-4 sets of 30-60 seconds"]',
  tips_ru = '["Приземляйтесь на носки", "Держите спину прямой", "Работайте руками энергично", "Не торопитесь в начале"]',
  tips_en = '["Land on your toes", "Keep your back straight", "Work your arms energetically", "Don''t rush at the beginning"]'
WHERE exercise_id = '20';

-- Упражнение 21: Прыжки в длину с места
UPDATE exercises SET
  benefits_ru = '["Развивает взрывную силу", "Укрепляет мышцы ног", "Улучшает координацию", "Повышает прыгучесть"]',
  benefits_en = '["Develops explosive power", "Strengthens leg muscles", "Improves coordination", "Increases jumping ability"]',
  instructions_ru = '["Встаньте прямо, ноги на ширине плеч", "Согните ноги в коленях", "Оттолкнитесь обеими ногами одновременно", "Прыгните как можно дальше вперед", "Приземлитесь на обе ноги", "Выполните 3-4 подхода по 5-10 прыжков"]',
  instructions_en = '["Stand straight, feet shoulder-width apart", "Bend your knees", "Push off with both feet simultaneously", "Jump as far forward as possible", "Land on both feet", "Perform 3-4 sets of 5-10 jumps"]',
  tips_ru = '["Приземляйтесь мягко", "Сгибайте ноги при приземлении", "Работайте руками для баланса", "Не торопитесь между прыжками"]',
  tips_en = '["Land softly", "Bend your knees when landing", "Use your arms for balance", "Don''t rush between jumps"]'
WHERE exercise_id = '21';

-- Упражнение 26: Разминка голеностопа
UPDATE exercises SET
  benefits_ru = '["Разогревает голеностопные суставы", "Предотвращает травмы", "Улучшает подвижность", "Подготавливает к нагрузкам"]',
  benefits_en = '["Warms up ankle joints", "Prevents injuries", "Improves mobility", "Prepares for loads"]',
  instructions_ru = '["Сядьте на пол, вытянув ноги", "Вращайте стопами по часовой стрелке", "Затем против часовой стрелки", "Сгибайте и разгибайте стопы", "Выполните круговые движения пальцами", "Повторите для каждой ноги по 2-3 минуты"]',
  instructions_en = '["Sit on the floor with legs extended", "Rotate your feet clockwise", "Then counterclockwise", "Flex and extend your feet", "Perform circular movements with your toes", "Repeat for each leg for 2-3 minutes"]',
  tips_ru = '["Двигайтесь медленно и плавно", "Не делайте резких движений", "Дышите ровно", "Сосредоточьтесь на ощущениях"]',
  tips_en = '["Move slowly and smoothly", "Don''t make sudden movements", "Breathe evenly", "Focus on sensations"]'
WHERE exercise_id = '26';


