// Создаем SQL скрипт только для обновления русских инструкций и советов

const fs = require('fs');
const path = require('path');

// Читаем переведенный CSV файл
const csvPath = path.join(__dirname, 'exercises-translated-complete.csv');

if (!fs.existsSync(csvPath)) {
  console.log('❌ Файл exercises-translated-complete.csv не найден!');
  process.exit(1);
}

const csvContent = fs.readFileSync(csvPath, 'utf8');
const lines = csvContent.split('\n');

// Простая функция для парсинга CSV с учетом кавычек
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // Пропускаем следующий символ
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}

// Парсим CSV
const translations = {};
const headers = parseCSVLine(lines[0]);

console.log('📋 Обрабатываем CSV файл...');

for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;
  
  const parts = parseCSVLine(line);
  if (parts.length < 2) continue;
  
  const key = parts[0];
  const russian = parts[1];
  
  translations[key] = russian;
}

console.log(`📊 Найдено ${Object.keys(translations).length} ключей для перевода`);

// Группируем по упражнениям
const exercises = {};
Object.entries(translations).forEach(([key, russianText]) => {
  const match = key.match(/exercises\.items\.(\d+)\.(title|instructions\.(\d+)|tips\.(\d+))/);
  if (!match) return;
  
  const exerciseId = match[1];
  const type = match[2];
  
  if (!exercises[exerciseId]) {
    exercises[exerciseId] = { title: null, instructions: [], tips: [] };
  }
  
  if (type === 'title') {
    exercises[exerciseId].title = russianText;
  } else if (type.startsWith('instructions.')) {
    const index = parseInt(match[3]);
    exercises[exerciseId].instructions[index] = russianText;
  } else if (type.startsWith('tips.')) {
    const index = parseInt(match[4]);
    exercises[exerciseId].tips[index] = russianText;
  }
});

console.log(`📊 Найдено ${Object.keys(exercises).length} упражнений`);

// Создаем SQL скрипт только для русских текстов
let sqlContent = `-- SQL скрипт для обновления русских инструкций и советов упражнений
-- Сгенерировано автоматически из CSV файла
-- Всего упражнений: ${Object.keys(exercises).length}

`;

Object.entries(exercises).forEach(([exerciseId, exercise]) => {
  console.log(`📝 Обрабатываем упражнение #${exerciseId}: ${exercise.title || 'Без названия'}`);
  
  // Обновляем только русские тексты
  if (exercise.title && exercise.instructions.length > 0 && exercise.tips.length > 0) {
    // Собираем только русские инструкции
    const russianInstructions = exercise.instructions
      .filter(Boolean)
      .filter(inst => inst.trim());
    
    // Собираем только русские советы
    const russianTips = exercise.tips
      .filter(Boolean)
      .filter(tip => tip.trim());
    
    if (russianInstructions.length > 0 && russianTips.length > 0) {
      sqlContent += `-- ${exercise.title} (#${exerciseId})
UPDATE exercises 
SET 
    instructions_ru = '${JSON.stringify(russianInstructions).replace(/'/g, "''")}',
    tips_ru = '${JSON.stringify(russianTips).replace(/'/g, "''")}',
    updated_at = NOW()
WHERE exercise_id = '${exerciseId}';

`;
    }
  }
});

// Сохраняем SQL файл
const outputPath = path.join(__dirname, 'update-russian-exercises-only.sql');
fs.writeFileSync(outputPath, sqlContent, 'utf8');

console.log(`✅ SQL скрипт создан: ${outputPath}`);
console.log(`📊 Размер файла: ${Math.round(fs.statSync(outputPath).size / 1024)}KB`);
console.log('\n🚀 Инструкции:');
console.log('1. Откройте Supabase Dashboard → SQL Editor');
console.log('2. Скопируйте содержимое файла update-russian-exercises-only.sql');
console.log('3. Выполните SQL скрипт');
console.log('4. Все русские инструкции и советы будут обновлены!');








