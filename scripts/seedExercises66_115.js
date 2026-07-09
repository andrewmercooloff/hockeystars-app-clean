/**
 * Inserts exercises 66–115 into Supabase.
 * Run: node scripts/seedExercises66_115.js
 */
require('dotenv').config();
const EXERCISES = require('./data/exercises66-115-ru-en');

async function main() {
  const { createClient } = require('@supabase/supabase-js');
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error('Missing SUPABASE_URL / key in .env');
    process.exit(1);
  }
  const supabase = createClient(url, key);

  const rows = EXERCISES.map((ex) => ({
    exercise_id: ex.id,
    category: ex.category,
    duration: ex.duration,
    difficulty: ex.difficulty,
    title_ru: ex.ru.title,
    description_ru: ex.ru.description,
    benefits_ru: ex.ru.benefits,
    instructions_ru: ex.ru.instructions,
    tips_ru: ex.ru.tips,
    equipment_ru: ex.ru.equipment,
    calories_ru: ex.ru.calories,
    title_en: ex.en.title,
    description_en: ex.en.description,
    benefits_en: ex.en.benefits,
    instructions_en: ex.en.instructions,
    tips_en: ex.en.tips,
    equipment_en: ex.en.equipment,
    calories_en: ex.en.calories,
    category_ru: ex.category,
    category_en: ex.categoryEn,
    difficulty_ru: ex.difficulty,
    difficulty_en: ex.difficultyEn,
    duration_ru: ex.duration,
    duration_en: ex.durationEn,
    is_active: true,
  }));

  const { data, error } = await supabase.from('exercises').upsert(rows, { onConflict: 'exercise_id' }).select('exercise_id');
  if (error) {
    console.error('❌ Supabase upsert failed:', error.message);
    process.exit(1);
  }
  console.log(`✅ Upserted ${data?.length ?? rows.length} exercises (66–115)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
