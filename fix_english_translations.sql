-- Исправление английских переводов для всех упражнений
-- Выполните этот скрипт в Supabase SQL Editor

-- Упражнение 27: Разминка шеи
UPDATE exercises SET
  benefits_en = '["Warms up neck muscles", "Prevents neck injuries", "Improves neck mobility", "Relieves tension"]',
  instructions_en = '["Sit or stand straight", "Slowly turn your head left and right", "Tilt your head forward and back", "Perform circular movements", "Repeat for 2-3 minutes"]',
  tips_en = '["Move slowly and smoothly", "Don''t make sudden movements", "Stop if you feel pain", "Breathe deeply during exercises"]'
WHERE exercise_id = '27';

-- Упражнение 28: Разминка запястий
UPDATE exercises SET
  benefits_en = '["Warms up wrist joints", "Prevents wrist injuries", "Improves wrist flexibility", "Relieves tension"]',
  instructions_en = '["Extend your arms forward", "Rotate your wrists clockwise", "Then counterclockwise", "Flex and extend your wrists", "Repeat for 2-3 minutes"]',
  tips_en = '["Move slowly and smoothly", "Don''t force movements", "Stop if you feel pain", "Perform daily for best results"]'
WHERE exercise_id = '28';

-- Упражнение 29: Разминка коленей
UPDATE exercises SET
  benefits_en = '["Warms up knee joints", "Prevents knee injuries", "Improves knee mobility", "Prepares for loads"]',
  instructions_en = '["Stand straight, feet shoulder-width apart", "Slowly bend and straighten your knees", "Perform circular movements", "Add gentle squats", "Repeat for 2-3 minutes"]',
  tips_en = '["Move slowly and smoothly", "Don''t force movements", "Stop if you feel pain", "Focus on smooth motion"]'
WHERE exercise_id = '29';

-- Упражнение 30: Разминка тазобедренных суставов
UPDATE exercises SET
  benefits_en = '["Warms up hip joints", "Prevents hip injuries", "Improves hip mobility", "Relieves tension"]',
  instructions_en = '["Stand straight, hands on hips", "Slowly rotate your hips clockwise", "Then counterclockwise", "Add gentle swings", "Repeat for 2-3 minutes"]',
  tips_en = '["Move slowly and smoothly", "Don''t force movements", "Stop if you feel pain", "Focus on hip movement"]'
WHERE exercise_id = '30';

-- Упражнение 31: Растяжка паха
UPDATE exercises SET
  benefits_en = '["Improves groin flexibility", "Prevents groin injuries", "Relieves tension", "Improves mobility"]',
  instructions_en = '["Sit on the floor, soles together", "Gently press knees down", "Lean forward slightly", "Hold for 20-30 seconds", "Repeat 3-5 times"]',
  tips_en = '["Don''t force the stretch", "Breathe deeply", "Stop if you feel pain", "Perform daily for best results"]'
WHERE exercise_id = '31';

-- Упражнение 32: Растяжка подколенных сухожилий
UPDATE exercises SET
  benefits_en = '["Improves hamstring flexibility", "Prevents hamstring injuries", "Relieves tension", "Improves mobility"]',
  instructions_en = '["Sit on the floor, legs extended", "Reach forward toward your toes", "Hold for 20-30 seconds", "Don''t round your back", "Repeat 3-5 times"]',
  tips_en = '["Don''t force the stretch", "Keep your back straight", "Breathe deeply", "Stop if you feel pain"]'
WHERE exercise_id = '32';

-- Упражнение 33: Растяжка икроножных мышц
UPDATE exercises SET
  benefits_en = '["Improves calf flexibility", "Prevents calf injuries", "Relieves tension", "Improves mobility"]',
  instructions_en = '["Stand facing a wall", "Place hands on wall", "Step one foot back", "Press heel down", "Hold for 20-30 seconds", "Repeat for both legs"]',
  tips_en = '["Don''t force the stretch", "Keep your back straight", "Breathe deeply", "Stop if you feel pain"]'
WHERE exercise_id = '33';

-- Упражнение 34: Растяжка грудных мышц
UPDATE exercises SET
  benefits_en = '["Improves chest flexibility", "Prevents chest injuries", "Relieves tension", "Improves posture"]',
  instructions_en = '["Stand in doorway", "Place forearms on door frame", "Step forward slightly", "Feel stretch in chest", "Hold for 20-30 seconds", "Repeat 3-5 times"]',
  tips_en = '["Don''t force the stretch", "Breathe deeply", "Stop if you feel pain", "Focus on chest muscles"]'
WHERE exercise_id = '34';

-- Упражнение 35: Растяжка трицепсов
UPDATE exercises SET
  benefits_en = '["Improves tricep flexibility", "Prevents tricep injuries", "Relieves tension", "Improves mobility"]',
  instructions_en = '["Raise one arm overhead", "Bend elbow, hand behind head", "Use other hand to gently pull", "Hold for 20-30 seconds", "Repeat for both arms"]',
  tips_en = '["Don''t force the stretch", "Breathe deeply", "Stop if you feel pain", "Focus on tricep muscles"]'
WHERE exercise_id = '35';

-- Упражнение 36: Змейка между конусами
UPDATE exercises SET
  benefits_en = '["Develops agility", "Improves coordination", "Increases speed", "Strengthens leg muscles"]',
  instructions_en = '["Set up cones in a line", "Weave between cones quickly", "Change direction at each cone", "Increase speed gradually", "Perform 3-5 sets of 30 seconds"]',
  tips_en = '["Start slowly, then accelerate", "Watch for proper technique", "Rest between sets", "Use different patterns"]'
WHERE exercise_id = '36';

-- Упражнение 37: Быстрые касания ногами
UPDATE exercises SET
  benefits_en = '["Develops foot speed", "Improves coordination", "Increases agility", "Strengthens leg muscles"]',
  instructions_en = '["Stand next to a cone", "Quickly tap cone with foot", "Return to starting position", "Alternate feet", "Increase speed gradually", "Perform 3-5 sets of 30 seconds"]',
  tips_en = '["Start slowly, then accelerate", "Watch for proper technique", "Rest between sets", "Focus on quick movements"]'
WHERE exercise_id = '37';

-- Упражнение 38: Прыжки с поворотами
UPDATE exercises SET
  benefits_en = '["Develops explosive power", "Improves coordination", "Increases agility", "Strengthens leg muscles"]',
  instructions_en = '["Stand straight, feet together", "Jump up and rotate 90 degrees", "Land softly on both feet", "Jump and rotate back", "Increase rotation gradually", "Perform 3-4 sets of 10 jumps"]',
  tips_en = '["Land softly on both feet", "Bend knees when landing", "Use arms for balance", "Don''t rush between jumps"]'
WHERE exercise_id = '38';

-- Упражнение 39: Быстрые передачи мяча
UPDATE exercises SET
  benefits_en = '["Develops hand-eye coordination", "Improves reaction speed", "Increases agility", "Strengthens arm muscles"]',
  instructions_en = '["Stand with partner 2-3 meters apart", "Pass ball quickly back and forth", "Use both hands", "Increase speed gradually", "Add movement", "Perform 3-4 sets of 2 minutes"]',
  tips_en = '["Focus on accuracy first", "Then increase speed", "Use both hands equally", "Keep ball at chest level"]'
WHERE exercise_id = '39';

-- Упражнение 40: Бег спиной вперед
UPDATE exercises SET
  benefits_en = '["Develops coordination", "Improves balance", "Increases agility", "Strengthens leg muscles"]',
  instructions_en = '["Start slowly, running backwards", "Look over your shoulder", "Increase speed gradually", "Use short, quick steps", "Perform 3-4 sets of 30 seconds"]',
  tips_en = '["Start slowly", "Look over your shoulder", "Use short steps", "Stop if you feel unsafe"]'
WHERE exercise_id = '40';

-- Упражнение 41: Приседания с весом
UPDATE exercises SET
  benefits_en = '["Strengthens leg muscles", "Develops power", "Improves balance", "Increases muscle mass"]',
  instructions_en = '["Stand with feet shoulder-width apart", "Hold weight at chest level", "Lower into squat position", "Keep back straight", "Push through heels to stand", "Perform 3-4 sets of 8-12 reps"]',
  tips_en = '["Start with light weight", "Keep back straight", "Don''t let knees cave in", "Breathe out on the way up"]'
WHERE exercise_id = '41';

-- Упражнение 42: Становая тяга
UPDATE exercises SET
  benefits_en = '["Strengthens back muscles", "Develops power", "Improves posture", "Increases muscle mass"]',
  instructions_en = '["Stand with feet hip-width apart", "Hold weight in front of thighs", "Hinge at hips, lower weight", "Keep back straight", "Return to starting position", "Perform 3-4 sets of 6-10 reps"]',
  tips_en = '["Start with light weight", "Keep back straight", "Don''t round your back", "Breathe out on the way up"]'
WHERE exercise_id = '42';

-- Упражнение 43: Жим лежа
UPDATE exercises SET
  benefits_en = '["Strengthens chest muscles", "Develops power", "Improves upper body strength", "Increases muscle mass"]',
  instructions_en = '["Lie on bench, feet flat", "Hold weight at chest level", "Press weight up and out", "Lower slowly to chest", "Keep back flat", "Perform 3-4 sets of 8-12 reps"]',
  tips_en = '["Start with light weight", "Keep back flat", "Don''t bounce weight off chest", "Breathe out on the way up"]'
WHERE exercise_id = '43';

-- Упражнение 44: Подтягивания
UPDATE exercises SET
  benefits_en = '["Strengthens back and arm muscles", "Develops power", "Improves grip strength", "Increases muscle mass"]',
  instructions_en = '["Hang from pull-up bar", "Hands slightly wider than shoulders", "Pull body up until chin over bar", "Lower slowly to starting position", "Keep core engaged", "Perform 3-4 sets of 5-10 reps"]',
  tips_en = '["Start with assisted pull-ups", "Keep core engaged", "Don''t swing", "Breathe out on the way up"]'
WHERE exercise_id = '44';

-- Упражнение 45: Отжимания на брусьях
UPDATE exercises SET
  benefits_en = '["Strengthens chest and arm muscles", "Develops power", "Improves upper body strength", "Increases muscle mass"]',
  instructions_en = '["Support yourself on parallel bars", "Lower body until shoulders below elbows", "Push up to starting position", "Keep body straight", "Perform 3-4 sets of 5-10 reps"]',
  tips_en = '["Start with assisted dips", "Keep body straight", "Don''t go too low", "Breathe out on the way up"]'
WHERE exercise_id = '45';

-- Упражнение 46: Стойка на одной ноге
UPDATE exercises SET
  benefits_en = '["Improves balance", "Strengthens leg muscles", "Develops stability", "Increases coordination"]',
  instructions_en = '["Stand on one foot", "Lift other foot off ground", "Hold for 30-60 seconds", "Keep core engaged", "Switch legs", "Perform 3-4 sets per leg"]',
  tips_en = '["Start with shorter holds", "Keep core engaged", "Focus on a fixed point", "Don''t hold your breath"]'
WHERE exercise_id = '46';

-- Упражнение 47: Планка на одной ноге
UPDATE exercises SET
  benefits_en = '["Strengthens core muscles", "Improves balance", "Develops stability", "Increases coordination"]',
  instructions_en = '["Start in plank position", "Lift one foot off ground", "Hold for 15-30 seconds", "Keep body straight", "Switch legs", "Perform 3-4 sets per leg"]',
  tips_en = '["Start with shorter holds", "Keep body straight", "Don''t let hips sag", "Breathe normally"]'
WHERE exercise_id = '47';

-- Упражнение 48: Приседания на одной ноге
UPDATE exercises SET
  benefits_en = '["Strengthens leg muscles", "Improves balance", "Develops stability", "Increases coordination"]',
  instructions_en = '["Stand on one foot", "Extend other leg forward", "Lower into squat position", "Return to starting position", "Keep core engaged", "Perform 3-4 sets of 5-10 reps per leg"]',
  tips_en = '["Start with assisted squats", "Keep core engaged", "Don''t let knee cave in", "Use support if needed"]'
WHERE exercise_id = '48';

-- Упражнение 49: Босу-мяч упражнения
UPDATE exercises SET
  benefits_en = '["Improves balance", "Strengthens core muscles", "Develops stability", "Increases coordination"]',
  instructions_en = '["Stand on BOSU ball", "Keep balance for 30-60 seconds", "Add arm movements", "Try squats on ball", "Perform 3-4 sets of 30-60 seconds"]',
  tips_en = '["Start with shorter holds", "Keep core engaged", "Focus on balance", "Use support if needed"]'
WHERE exercise_id = '49';

-- Упражнение 50: Йога-баланс
UPDATE exercises SET
  benefits_en = '["Improves balance", "Strengthens core muscles", "Develops stability", "Increases flexibility"]',
  instructions_en = '["Start in mountain pose", "Shift weight to one foot", "Lift other foot to calf", "Hold for 30-60 seconds", "Switch legs", "Perform 3-4 sets per leg"]',
  tips_en = '["Start with shorter holds", "Keep core engaged", "Focus on breathing", "Don''t force the pose"]'
WHERE exercise_id = '50';

-- Упражнение 51: Ходьба по бревну
UPDATE exercises SET
  benefits_en = '["Improves balance", "Strengthens leg muscles", "Develops stability", "Increases coordination"]',
  instructions_en = '["Walk along balance beam", "Keep arms out for balance", "Take slow, steady steps", "Focus on foot placement", "Perform 3-4 sets of 30-60 seconds"]',
  tips_en = '["Start with wider beam", "Keep arms out for balance", "Focus on foot placement", "Don''t rush"]'
WHERE exercise_id = '51';

-- Упражнение 52: Стойка на руках у стены
UPDATE exercises SET
  benefits_en = '["Strengthens arm and shoulder muscles", "Improves balance", "Develops stability", "Increases coordination"]',
  instructions_en = '["Place hands on ground near wall", "Walk feet up wall", "Hold handstand position", "Keep core engaged", "Hold for 15-30 seconds", "Perform 3-4 sets"]',
  tips_en = '["Start with shorter holds", "Keep core engaged", "Don''t hold your breath", "Use spotter if needed"]'
WHERE exercise_id = '52';

-- Упражнение 53: Фартлек
UPDATE exercises SET
  benefits_en = '["Develops endurance", "Improves cardiovascular fitness", "Increases speed", "Burns calories"]',
  instructions_en = '["Start with 5-minute warm-up", "Alternate between fast and slow running", "Run fast for 2-3 minutes", "Jog slowly for 1-2 minutes", "Repeat for 20-30 minutes", "Finish with 5-minute cool-down"]',
  tips_en = '["Listen to your body", "Don''t overdo it", "Stay hydrated", "Warm up and cool down"]'
WHERE exercise_id = '53';

-- Упражнение 54: Повторные спринты
UPDATE exercises SET
  benefits_en = '["Develops speed", "Improves cardiovascular fitness", "Increases power", "Burns calories"]',
  instructions_en = '["Warm up for 10 minutes", "Sprint for 30 seconds", "Rest for 90 seconds", "Repeat 6-8 times", "Cool down for 10 minutes", "Perform 2-3 times per week"]',
  tips_en = '["Don''t overdo it", "Stay hydrated", "Warm up properly", "Listen to your body"]'
WHERE exercise_id = '54';

-- Упражнение 55: Интервалы на велосипеде
UPDATE exercises SET
  benefits_en = '["Develops endurance", "Improves cardiovascular fitness", "Increases leg strength", "Burns calories"]',
  instructions_en = '["Warm up for 10 minutes", "Pedal hard for 2 minutes", "Pedal easy for 1 minute", "Repeat 6-8 times", "Cool down for 10 minutes", "Perform 2-3 times per week"]',
  tips_en = '["Adjust resistance as needed", "Stay hydrated", "Warm up properly", "Don''t overdo it"]'
WHERE exercise_id = '55';

-- Упражнение 56: Бег по холмам
UPDATE exercises SET
  benefits_en = '["Develops leg strength", "Improves cardiovascular fitness", "Increases power", "Burns calories"]',
  instructions_en = '["Warm up for 10 minutes", "Run up hill for 1-2 minutes", "Jog down hill for recovery", "Repeat 6-8 times", "Cool down for 10 minutes", "Perform 2-3 times per week"]',
  tips_en = '["Start with gentle hills", "Don''t overdo it", "Stay hydrated", "Warm up properly"]'
WHERE exercise_id = '56';

-- Упражнение 57: Плиометрические круги
UPDATE exercises SET
  benefits_en = '["Develops explosive power", "Improves coordination", "Increases speed", "Strengthens leg muscles"]',
  instructions_en = '["Set up cones in circle", "Jump over each cone", "Land softly on both feet", "Move quickly to next cone", "Complete 3-5 circles", "Rest 2-3 minutes between circles"]',
  tips_en = '["Land softly on both feet", "Keep movements quick", "Don''t overdo it", "Focus on technique"]'
WHERE exercise_id = '57';

-- Упражнение 58: Легкая растяжка
UPDATE exercises SET
  benefits_en = '["Improves flexibility", "Relieves muscle tension", "Reduces stress", "Improves mobility"]',
  instructions_en = '["Start with neck stretches", "Move to shoulder rolls", "Stretch arms and chest", "Stretch legs and back", "Hold each stretch for 20-30 seconds", "Perform daily"]',
  tips_en = '["Don''t force stretches", "Breathe deeply", "Stop if you feel pain", "Perform daily for best results"]'
WHERE exercise_id = '58';

-- Упражнение 59: Фоам-роллинг
UPDATE exercises SET
  benefits_en = '["Relieves muscle tension", "Improves circulation", "Reduces soreness", "Improves mobility"]',
  instructions_en = '["Start with calf muscles", "Roll slowly up and down", "Spend 30-60 seconds per muscle", "Move to other muscle groups", "Focus on tight areas", "Perform daily"]',
  tips_en = '["Don''t roll too fast", "Focus on tight areas", "Stop if you feel pain", "Perform daily for best results"]'
WHERE exercise_id = '59';

-- Упражнение 60: Легкий бег
UPDATE exercises SET
  benefits_en = '["Improves cardiovascular fitness", "Burns calories", "Reduces stress", "Improves mood"]',
  instructions_en = '["Start with 5-minute walk", "Begin light jogging", "Maintain conversational pace", "Run for 20-30 minutes", "Finish with 5-minute walk", "Perform 3-4 times per week"]',
  tips_en = '["Start slowly", "Don''t overdo it", "Stay hydrated", "Listen to your body"]'
WHERE exercise_id = '60';

-- Упражнение 61: Плавание
UPDATE exercises SET
  benefits_en = '["Improves cardiovascular fitness", "Strengthens all muscles", "Low impact exercise", "Burns calories"]',
  instructions_en = '["Warm up with easy swimming", "Swim at moderate pace", "Use different strokes", "Swim for 20-30 minutes", "Cool down with easy swimming", "Perform 2-3 times per week"]',
  tips_en = '["Start slowly", "Don''t overdo it", "Stay hydrated", "Focus on technique"]'
WHERE exercise_id = '61';

-- Упражнение 62: Велосипед восстановления
UPDATE exercises SET
  benefits_en = '["Improves circulation", "Reduces muscle soreness", "Low impact exercise", "Improves mood"]',
  instructions_en = '["Start with easy pedaling", "Maintain low intensity", "Pedal for 20-30 minutes", "Keep heart rate low", "Focus on smooth pedaling", "Perform daily"]',
  tips_en = '["Keep intensity low", "Focus on smooth pedaling", "Don''t overdo it", "Stay hydrated"]'
WHERE exercise_id = '62';

-- Упражнение 63: Йога восстановления
UPDATE exercises SET
  benefits_en = '["Reduces stress", "Improves flexibility", "Relieves tension", "Improves mood"]',
  instructions_en = '["Start with child pose", "Move to cat-cow stretches", "Try gentle twists", "End with savasana", "Hold each pose for 1-2 minutes", "Perform daily"]',
  tips_en = '["Don''t force poses", "Breathe deeply", "Focus on relaxation", "Perform daily for best results"]'
WHERE exercise_id = '63';

-- Упражнение 65: Контрастный душ
UPDATE exercises SET
  benefits_en = '["Improves circulation", "Reduces muscle soreness", "Boosts immune system", "Improves mood"]',
  instructions_en = '["Start with warm water", "Switch to cold water for 30 seconds", "Switch back to warm water", "Repeat 3-5 times", "End with cold water", "Perform daily"]',
  tips_en = '["Don''t overdo it", "Listen to your body", "Start gradually", "Focus on breathing"]'
WHERE exercise_id = '65';
