// Улучшенный скрипт для конвертации переведенного CSV файла в SQL скрипт для Supabase

const fs = require('fs');
const path = require('path');

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

function convertTranslatedCSVToSQL() {
  console.log('🔄 Конвертируем переведенный CSV в SQL скрипт (улучшенная версия)...');
  
  // Читаем переведенный CSV файл
  const csvPath = path.join(__dirname, 'exercises-translated-complete.csv');
  
  if (!fs.existsSync(csvPath)) {
    console.log('❌ Файл exercises-translated-complete.csv не найден!');
    return;
  }
  
  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const lines = csvContent.split('\n');
  
  // Парсим CSV
  const translations = {};
  const headers = parseCSVLine(lines[0]);
  
  console.log('📋 Найденные языки:', headers.slice(2)); // Пропускаем KEY и RUSSIAN
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const parts = parseCSVLine(line);
    if (parts.length < 2) continue;
    
    const key = parts[0];
    const russian = parts[1];
    
    if (!translations[key]) {
      translations[key] = { russian };
    }
    
    // Добавляем переводы для каждого языка
    for (let j = 2; j < parts.length && j < headers.length; j++) {
      const langCode = headers[j].toLowerCase().trim().replace('\r', '');
      const translation = parts[j];
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

  const availableLanguages = ['polski', 'svenska', 'čeština', 'slovenčina', 'suomi', 'italiano', 'deutsch', 'français'];
  const langMapping = {
    'polski': 'pl',
    'svenska': 'sv', 
    'čeština': 'cs',
    'slovenčina': 'sk',
    'suomi': 'fi',
    'italiano': 'it',
    'deutsch': 'de',
    'français': 'fr'
  };
  
  Object.entries(exercises).forEach(([exerciseId, exercise]) => {
    console.log(`📝 Обрабатываем упражнение #${exerciseId}: ${exercise.title?.russian || 'Без названия'}`);
    
    // Обновляем русские тексты
    if (exercise.title?.russian && exercise.instructions.length > 0 && exercise.tips.length > 0) {
      // Собираем только русские инструкции
      const russianInstructions = exercise.instructions
        .filter(Boolean)
        .map(inst => inst.russian)
        .filter(Boolean);
      
      // Собираем только русские советы
      const russianTips = exercise.tips
        .filter(Boolean)
        .map(tip => tip.russian)
        .filter(Boolean);
      
      sqlContent += `-- ${exercise.title.russian} (#${exerciseId})
UPDATE exercises 
SET 
    instructions_ru = '${JSON.stringify(russianInstructions).replace(/'/g, "''")}',
    tips_ru = '${JSON.stringify(russianTips).replace(/'/g, "''")}',
    updated_at = NOW()
WHERE exercise_id = '${exerciseId}';

`;

      // Добавляем переводы для каждого языка
      availableLanguages.forEach(langName => {
        const langCode = langMapping[langName];
        if (exercise.title?.[langName] && exercise.instructions.some(inst => inst?.[langName])) {
          const translatedInstructions = exercise.instructions
            .filter(Boolean)
            .map(inst => inst[langName] || inst.russian)
            .filter(Boolean);
          
          const translatedTips = exercise.tips
            .filter(Boolean)
            .map(tip => tip[langName] || tip.russian)
            .filter(Boolean);
          
          if (translatedInstructions.length > 0 && translatedTips.length > 0) {
            sqlContent += `-- ${exercise.title.russian} - ${langName.toUpperCase()} перевод
UPDATE exercises 
SET 
    title_${langCode} = '${exercise.title[langName].replace(/'/g, "''")}',
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
  const outputPath = path.join(__dirname, 'final-exercises-translations-v2.sql');
  fs.writeFileSync(outputPath, sqlContent, 'utf8');
  
  console.log(`✅ SQL скрипт создан: ${outputPath}`);
  console.log(`📊 Размер файла: ${Math.round(fs.statSync(outputPath).size / 1024)}KB`);
  console.log('\n🚀 Инструкции:');
  console.log('1. Откройте Supabase Dashboard → SQL Editor');
  console.log('2. Скопируйте содержимое файла final-exercises-translations-v2.sql');
  console.log('3. Выполните SQL скрипт');
  console.log('4. Все упражнения будут обновлены с переводами!');
}

// Запускаем конвертацию
convertTranslatedCSVToSQL();








