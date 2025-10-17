// Скрипт для конвертации переведенного CSV файла в SQL скрипт для Supabase

const fs = require('fs');
const path = require('path');

function convertTranslatedCSVToSQL() {
  console.log('🔄 Конвертируем переведенный CSV в SQL скрипт...');
  
  // Читаем переведенный CSV файл
  const csvPath = path.join(__dirname, 'exercises-translated-complete.csv');
  
  if (!fs.existsSync(csvPath)) {
    console.log('❌ Файл exercises-translated-complete.csv не найден!');
    console.log('📋 Инструкции:');
    console.log('1. Переведите файл exercises-russian-for-translation.csv');
    console.log('2. Сохраните как exercises-translated-complete.csv');
    console.log('3. Загрузите в папку scripts/');
    console.log('4. Запустите этот скрипт снова');
    return;
  }
  
  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const lines = csvContent.split('\n');
  
  // Парсим CSV
  const translations = {};
  const headers = lines[0].split(',');
  
  console.log('📋 Найденные языки:', headers.slice(2)); // Пропускаем KEY и RUSSIAN
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Простой парсинг CSV (может потребоваться улучшение для сложных случаев)
    const parts = line.split(',');
    if (parts.length < 2) continue;
    
    const key = parts[0];
    const russian = parts[1].replace(/^"(.*)"$/, '$1'); // Убираем кавычки
    
    if (!translations[key]) {
      translations[key] = { russian };
    }
    
    // Добавляем переводы для каждого языка
    for (let j = 2; j < parts.length && j < headers.length; j++) {
      const langCode = headers[j].toLowerCase();
      const translation = parts[j].replace(/^"(.*)"$/, '$1'); // Убираем кавычки
      translations[key][langCode] = translation;
    }
  }
  
  console.log(`📊 Найдено ${Object.keys(translations).length} ключей для перевода`);
  
  // Группируем по упражнениям
  const exercises = {};
  Object.entries(translations).forEach(([key, translations]) => {
    const match = key.match(/exercises\.items\.(\d+)\.(title|instructions\.(\d+)|tips\.(\d+))/);
    if (!match) return;
    
    const exerciseId = match[1];
    const type = match[2];
    
    if (!exercises[exerciseId]) {
      exercises[exerciseId] = { title: null, instructions: [], tips: [] };
    }
    
    if (type === 'title') {
      exercises[exerciseId].title = translations;
    } else if (type.startsWith('instructions.')) {
      const index = parseInt(match[3]);
      exercises[exerciseId].instructions[index] = translations;
    } else if (type.startsWith('tips.')) {
      const index = parseInt(match[4]);
      exercises[exerciseId].tips[index] = translations;
    }
  });
  
  console.log(`📊 Найдено ${Object.keys(exercises).length} упражнений`);
  
  // Создаем SQL скрипт
  let sqlContent = `-- SQL скрипт для обновления упражнений с переводами
-- Сгенерировано автоматически из переведенного CSV файла
-- Всего упражнений: ${Object.keys(exercises).length}

`;

  const availableLanguages = ['pl', 'sv', 'cs', 'sk', 'fi', 'it', 'de', 'fr'];
  
  Object.entries(exercises).forEach(([exerciseId, exercise]) => {
    console.log(`📝 Обрабатываем упражнение #${exerciseId}: ${exercise.title?.russian || 'Без названия'}`);
    
    // Обновляем русские тексты
    if (exercise.title?.russian && exercise.instructions.length > 0 && exercise.tips.length > 0) {
      sqlContent += `-- ${exercise.title.russian} (#${exerciseId})
UPDATE exercises 
SET 
    instructions_ru = '${JSON.stringify(exercise.instructions.filter(Boolean)).replace(/'/g, "''")}',
    tips_ru = '${JSON.stringify(exercise.tips.filter(Boolean)).replace(/'/g, "''")}',
    updated_at = NOW()
WHERE exercise_id = '${exerciseId}';

`;

      // Добавляем переводы для каждого языка
      availableLanguages.forEach(langCode => {
        if (exercise.title?.[langCode] && exercise.instructions.some(inst => inst?.[langCode])) {
          const translatedInstructions = exercise.instructions
            .filter(Boolean)
            .map(inst => inst[langCode] || inst.russian)
            .filter(Boolean);
          
          const translatedTips = exercise.tips
            .filter(Boolean)
            .map(tip => tip[langCode] || tip.russian)
            .filter(Boolean);
          
          if (translatedInstructions.length > 0 && translatedTips.length > 0) {
            sqlContent += `-- ${exercise.title.russian} - ${langCode.toUpperCase()} перевод
UPDATE exercises 
SET 
    title_${langCode} = '${exercise.title[langCode].replace(/'/g, "''")}',
    instructions_${langCode} = '${JSON.stringify(translatedInstructions).replace(/'/g, "''")}',
    tips_${langCode} = '${JSON.stringify(translatedTips).replace(/'/g, "''")}',
    updated_at = NOW()
WHERE exercise_id = '${exerciseId}';

`;
          }
        }
      });
      
      sqlContent += `\n`;
    }
  });

  // Сохраняем SQL файл
  const outputPath = path.join(__dirname, 'final-exercises-translations.sql');
  fs.writeFileSync(outputPath, sqlContent, 'utf8');
  
  console.log(`✅ SQL скрипт создан: ${outputPath}`);
  console.log(`📊 Размер файла: ${Math.round(fs.statSync(outputPath).size / 1024)}KB`);
  console.log('\n🚀 Инструкции:');
  console.log('1. Откройте Supabase Dashboard → SQL Editor');
  console.log('2. Скопируйте содержимое файла final-exercises-translations.sql');
  console.log('3. Выполните SQL скрипт');
  console.log('4. Все упражнения будут обновлены с переводами!');
}

// Запускаем конвертацию
convertTranslatedCSVToSQL();








