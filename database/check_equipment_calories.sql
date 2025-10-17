-- Проверяем какие упражнения имеют русские equipment и calories
SELECT 
  exercise_id,
  title_en,
  equipment_ru,
  equipment_en,
  calories_ru,
  calories_en
FROM exercises 
WHERE equipment_en IS NULL 
   OR calories_en IS NULL 
   OR equipment_en = equipment_ru 
   OR calories_en = calories_ru
ORDER BY exercise_id::int;






























