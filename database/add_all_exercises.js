const fs = require('fs');

// Читаем файлы локализации
const ruData = JSON.parse(fs.readFileSync('./locales/ru.json', 'utf8'));
const enData = JSON.parse(fs.readFileSync('./locales/en.json', 'utf8'));

// Извлекаем упражнения из русской локализации
const ruExercises = ruData.exercises?.items || {};
const enExercises = enData.exercises?.items || {};

console.log(`Найдено упражнений в русской локализации: ${Object.keys(ruExercises).length}`);
console.log(`Найдено упражнений в английской локализации: ${Object.keys(enExercises).length}`);

// Создаем SQL скрипт для добавления всех упражнений
let sqlScript = `-- Добавление всех упражнений в базу данных
-- Выполните этот скрипт в Supabase SQL Editor

`;

// Функция для экранирования строк для SQL
function escapeString(str) {
  if (!str) return '';
  return str.replace(/'/g, "''");
}

// Функция для создания JSON массива
function createJsonArray(arr) {
  if (!arr || !Array.isArray(arr)) return '[]';
  return JSON.stringify(arr.map(item => escapeString(item)));
}

// Обрабатываем каждое упражнение
Object.keys(ruExercises).forEach(exerciseId => {
  const ruExercise = ruExercises[exerciseId];
  const enExercise = enExercises[exerciseId];
  
  if (!ruExercise || !enExercise) {
    console.log(`⚠️ Пропускаем упражнение ${exerciseId} - нет переводов`);
    return;
  }

  // Определяем категорию и сложность
  const category = ruExercise.category || 'Общее';
  const difficulty = ruExercise.difficulty || 'Средний';
  const duration = ruExercise.duration || '10-15 мин';
  const equipment = ruExercise.equipment || 'Не требуется';
  const calories = ruExercise.calories || '100-200 ккал';

  sqlScript += `-- Упражнение ${exerciseId}
INSERT INTO exercises (
  exercise_id, category, duration, difficulty,
  title_ru, description_ru, benefits_ru, instructions_ru, tips_ru, equipment_ru, calories_ru,
  title_en, description_en, benefits_en, instructions_en, tips_en, equipment_en, calories_en
) VALUES (
  '${exerciseId}',
  '${escapeString(category)}',
  '${escapeString(duration)}',
  '${escapeString(difficulty)}',
  '${escapeString(ruExercise.title)}',
  '${escapeString(ruExercise.description)}',
  '${createJsonArray(ruExercise.benefits)}',
  '${createJsonArray(ruExercise.instructions)}',
  '${createJsonArray(ruExercise.tips)}',
  '${escapeString(equipment)}',
  '${escapeString(calories)}',
  '${escapeString(enExercise.title)}',
  '${escapeString(enExercise.description)}',
  '${createJsonArray(enExercise.benefits)}',
  '${createJsonArray(enExercise.instructions)}',
  '${createJsonArray(enExercise.tips)}',
  '${escapeString(equipment)}',
  '${escapeString(calories)}'
);

`;
});

// Добавляем проверку в конце
sqlScript += `
-- Проверяем количество добавленных упражнений
SELECT COUNT(*) as total_exercises FROM exercises;
`;

// Сохраняем SQL скрипт
fs.writeFileSync('./database/add_all_exercises.sql', sqlScript);

console.log('✅ SQL скрипт создан: database/add_all_exercises.sql');
console.log(`📊 Будет добавлено упражнений: ${Object.keys(ruExercises).length}`);



