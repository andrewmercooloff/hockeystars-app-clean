// Скрипт для обновления файлов локализации с переводами упражнений

const fs = require('fs');
const path = require('path');

// Читаем переведенный CSV файл
const csvPath = path.join(__dirname, '1.csv');

if (!fs.existsSync(csvPath)) {
  console.log('❌ Файл 1.csv не найден!');
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

// Парсим заголовки
const headers = parseCSVLine(lines[0]);
console.log('📋 Заголовки:', headers);

// Создаем объект для хранения переводов по языкам
const languageData = {
  ru: {},
  pl: {},
  sv: {},
  cs: {},
  sk: {},
  fi: {},
  it: {},
  de: {},
  fr: {}
};

// Парсим CSV
console.log(`📊 Всего строк в CSV: ${lines.length}`);

for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;
  
  const parts = parseCSVLine(line);
  if (parts.length < 2) continue;
  
  const key = parts[0];
  
  // Парсим ключ: exercises.items.27.title или exercises.items.27.instructions.0
  const match = key.match(/exercises\.items\.(\d+)\.(title|instructions\.(\d+)|tips\.(\d+))/);
  if (!match) {
    continue;
  }
  
  const exerciseId = match[1];
  const keyType = match[2];
  
  // Обрабатываем каждый язык
  headers.forEach((lang, index) => {
    if (index === 0) return; // Пропускаем KEY
    
    // Маппинг названий языков к кодам
    const langMapping = {
      'RUSSIAN': 'ru',
      'Polski': 'pl',
      'Svenska': 'sv',
      'Čeština': 'cs',
      'Slovenčina': 'sk',
      'Suomi': 'fi',
      'Italiano': 'it',
      'Deutsch': 'de',
      'Français': 'fr',
      'Français\r': 'fr' // Учитываем возможный \r в конце
    };
    
    const langCode = langMapping[lang.trim()];
    if (!langCode || !languageData[langCode]) {
      console.log(`⚠️ Неизвестный язык: "${lang}"`);
      return;
    }
    
    const translation = parts[index] || '';
    if (!translation) return;
    
    // Инициализируем структуру для упражнения
    if (!languageData[langCode][exerciseId]) {
      languageData[langCode][exerciseId] = {
        title: '',
        instructions: [],
        tips: []
      };
    }
    
    // Заполняем данные
    if (keyType === 'title') {
      languageData[langCode][exerciseId].title = translation;
    } else if (keyType.startsWith('instructions.')) {
      const index = parseInt(match[3]);
      languageData[langCode][exerciseId].instructions[index] = translation;
    } else if (keyType.startsWith('tips.')) {
      const index = parseInt(match[4]);
      languageData[langCode][exerciseId].tips[index] = translation;
    }
  });
}

// Обновляем файлы локализации
const localesDir = path.join(__dirname, '..', 'locales');

Object.entries(languageData).forEach(([lang, exercises]) => {
  const localeFile = path.join(localesDir, `${lang}.json`);
  
  // Читаем существующий файл локализации
  let localeData = {};
  if (fs.existsSync(localeFile)) {
    localeData = JSON.parse(fs.readFileSync(localeFile, 'utf8'));
  }
  
  // Убеждаемся, что структура exercises.items существует
  if (!localeData.exercises) {
    localeData.exercises = {};
  }
  if (!localeData.exercises.items) {
    localeData.exercises.items = {};
  }
  
  // Обновляем упражнения
  let updatedCount = 0;
  
  Object.entries(exercises).forEach(([exerciseId, data]) => {
    // Очищаем пустые элементы из массивов
    const cleanInstructions = data.instructions.filter(Boolean);
    const cleanTips = data.tips.filter(Boolean);
    
    if (data.title && cleanInstructions.length > 0 && cleanTips.length > 0) {
      localeData.exercises.items[exerciseId] = {
        title: data.title,
        instructions: cleanInstructions,
        tips: cleanTips
      };
      updatedCount++;
    }
  });
  
  // Сохраняем обновленный файл
  fs.writeFileSync(localeFile, JSON.stringify(localeData, null, 2), 'utf8');
  console.log(`✅ ${lang}.json обновлен (${updatedCount} упражнений)`);
});

console.log('\n🎉 Все файлы локализации обновлены!');
console.log('\n📱 Теперь упражнения будут отображаться на всех языках правильно!');

