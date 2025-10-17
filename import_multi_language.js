const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// Список поддерживаемых языков
const supportedLanguages = {
  'pl': 'Polski',
  'sv': 'Svenska', 
  'cs': 'Čeština',
  'sk': 'Slovenčina',
  'fi': 'Suomi',
  'it': 'Italiano',
  'de': 'Deutsch',
  'fr': 'Français'
};

// Получаем язык из аргументов командной строки
const targetLanguage = process.argv[2];

if (!targetLanguage || !supportedLanguages[targetLanguage]) {
  console.log('🌍 ИМПОРТ МНОГОЯЗЫЧНЫХ ПЕРЕВОДОВ');
  console.log('=================================');
  console.log('Использование: node import_multi_language.js [язык]');
  console.log('\nПоддерживаемые языки:');
  Object.entries(supportedLanguages).forEach(([code, name]) => {
    console.log(`  ${code} - ${name}`);
  });
  process.exit(1);
}

const languageName = supportedLanguages[targetLanguage];
console.log(`🌍 ИМПОРТ ПЕРЕВОДОВ ДЛЯ ${languageName.toUpperCase()}`);
console.log('===============================================');

// Функция для создания вложенной структуры объекта
function createNestedObject(keys, value) {
  const result = {};
  let current = result;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current)) {
      current[key] = {};
    }
    current = current[key];
  }
  
  current[keys[keys.length - 1]] = value;
  return result;
}

// Функция для объединения объектов
function mergeObjects(target, source) {
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (!target[key]) {
        target[key] = {};
      }
      mergeObjects(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

try {
  const csvPath = path.join(__dirname, 'multi_language_with_formulas.csv');
  
  if (!fs.existsSync(csvPath)) {
    console.log('❌ Файл multi_language_with_formulas.csv не найден!');
    console.log('💡 Сначала запустите: node export_with_formulas.js');
    process.exit(1);
  }
  
  console.log(`📂 Найден файл: multi_language_with_formulas.csv`);
  
  const translations = {};
  let processedCount = 0;
  let emptyCount = 0;
  
  // Читаем CSV файл
  fs.createReadStream(csvPath)
    .pipe(csv())
    .on('data', (row) => {
      const key = row.KEY;
      const translation = row[targetLanguage];
      
      if (translation && translation.trim() !== '') {
        const keys = key.split('.');
        const nestedObject = createNestedObject(keys, translation);
        mergeObjects(translations, nestedObject);
        processedCount++;
      } else {
        emptyCount++;
      }
      
      if (processedCount % 500 === 0) {
        console.log(`📈 Обработано ${processedCount} переводов...`);
      }
    })
    .on('end', () => {
      console.log(`📊 Прочитано ${processedCount} переводов`);
      console.log(`⏩ Пропущено: ${emptyCount}`);
      console.log(`📭 Из них пустых: ${emptyCount}`);
      
      // Создаем файл локализации
      const outputPath = path.join(__dirname, 'locales', `${targetLanguage}.json`);
      const jsonContent = JSON.stringify(translations, null, 2);
      
      fs.writeFileSync(outputPath, jsonContent, 'utf8');
      
      const percentage = Math.round((processedCount / (processedCount + emptyCount)) * 100);
      console.log(`\n✅ Импорт завершен`);
      console.log(`📈 Добавлено переводов: ${processedCount}`);
      console.log(`⏩ Пропущено: ${emptyCount}`);
      console.log(`📭 Из них пустых: ${emptyCount}`);
      console.log(`\n📊 Процент переведенных ключей: ${percentage}%`);
      console.log(`📝 Создан файл: locales/${targetLanguage}.json`);
      
      // Создаем отчет
      const reportPath = path.join(__dirname, `${targetLanguage}_import_report.txt`);
      const reportContent = `ОТЧЕТ ОБ ИМПОРТЕ ПЕРЕВОДОВ ДЛЯ ${languageName.toUpperCase()}
===============================================

Дата: ${new Date().toLocaleString()}
Язык: ${languageName} (${targetLanguage})
Файл: locales/${targetLanguage}.json

СТАТИСТИКА:
- Всего ключей обработано: ${processedCount + emptyCount}
- Успешно переведено: ${processedCount}
- Пропущено (пустые): ${emptyCount}
- Процент переведенных: ${percentage}%

СЛЕДУЮЩИЕ ШАГИ:
1. Перезапустите приложение: npx expo start --clear
2. Проверьте работу языка в переключателе
3. При необходимости добавьте склонения для опыта в хоккее

ФАЙЛЫ ДЛЯ ОБНОВЛЕНИЯ:
- locales/${targetLanguage}.json (создан)
- contexts/LanguageContext.tsx (уже обновлен)
- components/LanguageSwitcher.tsx (уже обновлен)
- types/exercise.ts (уже обновлен)
- utils/playerStorage.ts (уже обновлен)
`;
      
      fs.writeFileSync(reportPath, reportContent, 'utf8');
      console.log(`📝 Создан отчет: ${targetLanguage}_import_report.txt`);
      
      console.log(`\n🎉 ${languageName} перевод импортирован!`);
      console.log(`💡 Следующие шаги:`);
      console.log(`   1. Перезапустите приложение: npx expo start --clear`);
      console.log(`   2. Проверьте работу языка в переключателе`);
      console.log(`   3. При необходимости добавьте склонения для опыта в хоккее`);
    })
    .on('error', (error) => {
      console.error('❌ Ошибка чтения CSV:', error);
    });
    
} catch (error) {
  console.error('❌ Ошибка:', error);
}