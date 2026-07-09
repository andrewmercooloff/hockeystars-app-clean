/**
 * Adds exercises 66–115 (50 hockey exercises) to locale files + SQL.
 * Run: node scripts/buildExercises66_115.js
 * Then: node scripts/translateExercises66_115.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const LOCALES_DIR = path.join(ROOT, 'locales');
const LANGS = ['ru', 'en', 'lt', 'lv', 'pl', 'sv', 'cs', 'sk', 'fi', 'it', 'de', 'fr'];
const OTHER_LANGS = LANGS.filter((l) => l !== 'ru' && l !== 'en');

const BASE_EXERCISES = require('./data/exercises66-115-ru-en');
const RU_FIXED = require('./data/exercises66-115-ru-fixed');
const EXERCISES = BASE_EXERCISES.map((ex) => ({
  ...ex,
  ru: RU_FIXED[ex.id] || ex.ru,
}));

function escapeSql(str) {
  return (str || '').replace(/'/g, "''");
}

function jsonSql(arr) {
  return `'${escapeSql(JSON.stringify(arr || []))}'`;
}

function toLocaleItem(ex, lang) {
  const t = ex[lang] || ex.en;
  return {
    title: t.title,
    description: t.description,
    benefits: t.benefits,
    instructions: t.instructions,
    tips: t.tips,
    equipment: t.equipment,
    calories: t.calories,
    category: ex.category,
    difficulty: ex.difficulty,
    duration: ex.duration,
  };
}

function mergeLocales() {
  for (const lang of LANGS) {
    const filePath = path.join(LOCALES_DIR, `${lang}.json`);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (!data.exercises) data.exercises = {};
    if (!data.exercises.items) data.exercises.items = {};

    for (const ex of EXERCISES) {
      data.exercises.items[ex.id] = toLocaleItem(ex, lang);
    }

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
    console.log(`✅ locales/${lang}.json — +${EXERCISES.length} items`);
  }
}

function buildSql() {
  let sql = `-- Exercises 66-115\n`;
  for (const ex of EXERCISES) {
    const ru = ex.ru;
    const en = ex.en;
    sql += `INSERT INTO exercises (
  exercise_id, category, duration, difficulty,
  title_ru, description_ru, benefits_ru, instructions_ru, tips_ru, equipment_ru, calories_ru,
  title_en, description_en, benefits_en, instructions_en, tips_en, equipment_en, calories_en,
  category_ru, category_en, difficulty_ru, difficulty_en, duration_ru, duration_en,
  is_active
) VALUES (
  '${ex.id}',
  '${escapeSql(ex.category)}',
  '${escapeSql(ex.duration)}',
  '${escapeSql(ex.difficulty)}',
  '${escapeSql(ru.title)}',
  '${escapeSql(ru.description)}',
  ${jsonSql(ru.benefits)},
  ${jsonSql(ru.instructions)},
  ${jsonSql(ru.tips)},
  '${escapeSql(ru.equipment)}',
  '${escapeSql(ru.calories)}',
  '${escapeSql(en.title)}',
  '${escapeSql(en.description)}',
  ${jsonSql(en.benefits)},
  ${jsonSql(en.instructions)},
  ${jsonSql(en.tips)},
  '${escapeSql(en.equipment)}',
  '${escapeSql(en.calories)}',
  '${escapeSql(ex.category)}',
  '${escapeSql(ex.categoryEn)}',
  '${escapeSql(ex.difficulty)}',
  '${escapeSql(ex.difficultyEn)}',
  '${escapeSql(ex.duration)}',
  '${escapeSql(ex.durationEn)}',
  true
) ON CONFLICT (exercise_id) DO UPDATE SET
  category = EXCLUDED.category,
  duration = EXCLUDED.duration,
  difficulty = EXCLUDED.difficulty,
  title_ru = EXCLUDED.title_ru,
  description_ru = EXCLUDED.description_ru,
  benefits_ru = EXCLUDED.benefits_ru,
  instructions_ru = EXCLUDED.instructions_ru,
  tips_ru = EXCLUDED.tips_ru,
  equipment_ru = EXCLUDED.equipment_ru,
  calories_ru = EXCLUDED.calories_ru,
  title_en = EXCLUDED.title_en,
  description_en = EXCLUDED.description_en,
  benefits_en = EXCLUDED.benefits_en,
  instructions_en = EXCLUDED.instructions_en,
  tips_en = EXCLUDED.tips_en,
  equipment_en = EXCLUDED.equipment_en,
  calories_en = EXCLUDED.calories_en,
  is_active = true;

`;
  }
  const out = path.join(ROOT, 'database', 'exercises_66_115.sql');
  fs.writeFileSync(out, sql, 'utf8');
  console.log(`✅ ${out}`);
}

function patchExercisesDataTs() {
  const filePath = path.join(ROOT, 'utils', 'exercisesData.ts');
  let src = fs.readFileSync(filePath, 'utf8');
  if (src.includes("id: '66'")) {
    console.log('⏭ utils/exercisesData.ts already has 66+');
    return;
  }

  const blocks = EXERCISES.map((ex) => {
    const catKey = ex.category.replace(/'/g, "\\'");
    const diffKey = ex.difficulty.replace(/'/g, "\\'");
    return `  {
    id: '${ex.id}',
    titleKey: 'exercises.items.${ex.id}.title',
    descriptionKey: 'exercises.items.${ex.id}.description',
    categoryKey: 'exercises.categories.${catKey}',
    duration: '${ex.duration}',
    difficultyKey: 'exercises.difficulty.${diffKey}',
  },`;
  }).join('\n');

  src = src.replace(
    /(\s+\{\s+id: '65',[\s\S]*?\n  \})\n\];/,
    `$1,\n\n${blocks}\n];`,
  );
  fs.writeFileSync(filePath, src, 'utf8');
  console.log('✅ utils/exercisesData.ts patched');
}

mergeLocales();
buildSql();
patchExercisesDataTs();
console.log('Done. Run: node scripts/translateExercises66_115.js');
