-- Простое исправление equipment и calories

-- Обновляем equipment
UPDATE exercises SET 
  equipment_en = CASE 
    WHEN equipment_ru = 'Не требуется' THEN 'Not required'
    WHEN equipment_ru = 'Беговая дорожка или стадион' THEN 'Treadmill or stadium'
    WHEN equipment_ru = 'Коврик для упражнений (опционально)' THEN 'Exercise mat (optional)'
    WHEN equipment_ru = 'Велосипед или велотренажер' THEN 'Bicycle or exercise bike'
    WHEN equipment_ru = 'Открытое пространство или беговая дорожка' THEN 'Open space or treadmill'
    WHEN equipment_ru = 'Мяч 2-4 кг, стена' THEN '2-4 kg ball, wall'
    WHEN equipment_ru = 'Стена или стул для опоры' THEN 'Wall or chair for support'
    WHEN equipment_ru = 'Лестница' THEN 'Stairs'
    WHEN equipment_ru = 'Скакалка' THEN 'Jump rope'
    WHEN equipment_ru = 'Конусы или барьеры' THEN 'Cones or barriers'
    WHEN equipment_ru = 'Мяч 5-8 кг' THEN '5-8 kg ball'
    ELSE equipment_ru
  END
WHERE equipment_en IS NULL OR equipment_en = equipment_ru;

-- Обновляем calories
UPDATE exercises SET 
  calories_en = REPLACE(REPLACE(calories_ru, 'ккал', 'kcal'), 'за тренировку', 'per workout')
WHERE calories_en IS NULL OR calories_en = calories_ru;