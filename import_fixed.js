const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

const languageMap = {
  'pl': 'Polski',
  'sv': 'Svenska', 
  'cs': 'Čeština',
  'sk': 'Slovenčina',
  'fi': 'Suomi',
  'it': 'Italiano',
  'de': 'Deutsch',
  'fr': 'Français'
};

const targetLanguage = process.argv[2];
const languageName = languageMap[targetLanguage];

if (!languageName) {
  console.error('❌ Неверный код языка. Используйте: pl, sv, cs, sk, fi, it, de, fr');
  process.exit(1);
}

console.log(`🌍 ИМПОРТ ПЕРЕВОДОВ ДЛЯ ${languageName.toUpperCase()}`);
console.log('===============================================');

const csvPath = path.join(__dirname, 'multi_language_with_formulas.csv');

if (!fs.existsSync(csvPath)) {
  console.error('❌ Файл multi_language_with_formulas.csv не найден');
  process.exit(1);
}

console.log(`📂 Найден файл: ${path.basename(csvPath)}`);

let processedCount = 0;
let skippedCount = 0;
let emptyCount = 0;
let translations = {};

const createNestedObject = (keys, value) => {
  const result = {};
  let current = result;
  for (let i = 0; i < keys.length - 1; i++) {
    current[keys[i]] = {};
    current = current[keys[i]];
  }
  current[keys[keys.length - 1]] = value;
  return result;
};

const mergeObjects = (target, source) => {
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (!target[key]) target[key] = {};
      mergeObjects(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
};

fs.createReadStream(csvPath)
  .pipe(csv())
  .on('data', (row) => {
    const key = row.KEY;
    const translation = row[languageName];
    
    if (translation && translation.trim() !== '') {
      const keys = key.split('.');
      const nestedObject = createNestedObject(keys, translation);
      mergeObjects(translations, nestedObject);
      processedCount++;
    } else {
      skippedCount++;
      if (!translation || translation.trim() === '') {
        emptyCount++;
      }
    }
  })
  .on('end', () => {
    console.log(`📊 Прочитано ${processedCount + skippedCount} переводов`);
    console.log(`⏩ Пропущено: ${skippedCount}`);
    console.log(`📭 Из них пустых: ${emptyCount}`);
    
    const outputPath = path.join(__dirname, 'locales', `${targetLanguage}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(translations, null, 2));
    
    console.log('\n✅ Импорт завершен');
    console.log(`📈 Добавлено переводов: ${processedCount}`);
    console.log(`⏩ Пропущено: ${skippedCount}`);
    console.log(`📭 Из них пустых: ${emptyCount}`);
    
    const percentage = Math.round((processedCount / (processedCount + skippedCount)) * 100);
    console.log(`📊 Процент переведенных ключей: ${percentage}%`);
    console.log(`📝 Создан файл: ${outputPath}`);
    
    console.log('\n🎉 Перевод импортирован!');
    console.log('💡 Следующие шаги:');
    console.log('   1. Перезапустите приложение: npx expo start --clear');
    console.log('   2. Проверьте работу языка в переключателе');
    console.log('   3. При необходимости добавьте склонения для опыта в хоккее');
  });
