const fs = require('fs');
const path = require('path');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

// Список языков для перевода
const languages = [
  { code: 'pl', name: 'Polski' },
  { code: 'sv', name: 'Svenska' },
  { code: 'cs', name: 'Čeština' },
  { code: 'sk', name: 'Slovenčina' },
  { code: 'fi', name: 'Suomi' },
  { code: 'it', name: 'Italiano' },
  { code: 'de', name: 'Deutsch' },
  { code: 'fr', name: 'Français' }
];

// Функция для извлечения всех ключей и русских значений
function extractAllRussianTranslations(obj, prefix = '', allTranslations = []) {
  if (typeof obj === 'string') {
    allTranslations.push({
      key: prefix,
      russian: obj,
      // Добавляем пустые столбцы для всех языков
      ...languages.reduce((acc, lang) => {
        acc[lang.code] = '';
        return acc;
      }, {})
    });
  } else if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      extractAllRussianTranslations(item, `${prefix}[${index}]`, allTranslations);
    });
  } else if (typeof obj === 'object' && obj !== null) {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      extractAllRussianTranslations(value, fullKey, allTranslations);
    }
  }
  return allTranslations;
}

try {
  console.log('🌍 ЭКСПОРТ МНОГОЯЗЫЧНОЙ ТАБЛИЦЫ ПЕРЕВОДОВ');
  console.log('==========================================');
  
  // Загружаем русский файл
  const ruPath = path.join(__dirname, 'locales', 'ru.json');
  const ruData = JSON.parse(fs.readFileSync(ruPath, 'utf8'));
  
  // Извлекаем все русские переводы
  const allRussianTranslations = extractAllRussianTranslations(ruData);
  
  console.log(`📊 Найдено ${allRussianTranslations.length} ключей в русском файле`);
  
  // Статистика по доменам
  const domainStats = {};
  allRussianTranslations.forEach(item => {
    const domain = item.key.split('.')[0];
    domainStats[domain] = (domainStats[domain] || 0) + 1;
  });
  
  console.log('\n📈 Статистика по доменам:');
  Object.entries(domainStats)
    .sort(([, countA], [, countB]) => countB - countA)
    .slice(0, 20) // Топ-20 доменов
    .forEach(([domain, count], index) => {
      console.log(`${index + 1}. ${domain}: ${count} ключей`);
    });
  
  // Создаем заголовки для CSV
  const headers = [
    {id: 'key', title: 'KEY'},
    {id: 'russian', title: 'RUSSIAN'},
    ...languages.map(lang => ({id: lang.code, title: lang.name}))
  ];
  
  // Настройка CSV-файла
  const csvWriter = createCsvWriter({
    path: path.join(__dirname, 'multi_language_translation.csv'),
    header: headers
  });
  
  // Запись в CSV
  csvWriter.writeRecords(allRussianTranslations)
    .then(() => {
      console.log('✅ CSV-файл создан: multi_language_translation.csv');
      console.log('💡 Инструкции:');
      console.log('1. Откройте файл в Google Sheets или Excel');
      console.log('2. Переведите весь столбец RUSSIAN на нужные языки');
      console.log('3. Используйте формулы Google Translate:');
      languages.forEach(lang => {
        console.log(`   - ${lang.name}: =GOOGLETRANSLATE(B2,"ru","${lang.code}")`);
      });
      console.log('4. Скопируйте формулы для всех строк');
      console.log('5. Скопируйте и вставьте как значения (без формул)');
      console.log('6. Сохраните как CSV');
      console.log('7. Этот перевод создаст новые языковые файлы');
      
      console.log('\n📝 В файле включены все наши доработки:');
      console.log('   ✅ Категории упражнений (Endurance, Balance и т.д.)');
      console.log('   ✅ Сложность (Beginner, Intermediate, Advanced)');
      console.log('   ✅ Типы подарков (autograph, stick, puck, jersey)');
      console.log('   ✅ Опыт игрока в хоккее');
      console.log('   ✅ Все упражнения с деталями');
      console.log('   ✅ Все интерфейсные элементы');
      
      // Создаем текстовый файл с примерами
      const examplePath = path.join(__dirname, 'multi_language_examples.txt');
      const exampleContent = allRussianTranslations
        .slice(0, 50)  // Первые 50 строк как примеры
        .map(item => {
          const translations = languages.map(lang => `${lang.name}: ${item[lang.code] || '[ПУСТО]'}`).join('\n');
          return `KEY: ${item.key}\nRUSSIAN: ${item.russian}\n${translations}\n${'='.repeat(50)}`;
        })
        .join('\n\n');
      
      fs.writeFileSync(examplePath, exampleContent);
      console.log(`📄 Создан файл с примерами: multi_language_examples.txt`);
      
      console.log('\n🎯 Языки для перевода:');
      languages.forEach((lang, index) => {
        console.log(`${index + 1}. ${lang.name} (${lang.code})`);
      });
      
      console.log('\n🚀 После перевода используйте:');
      console.log('   node import_multi_language.js [язык]');
      console.log('   Например: node import_multi_language.js pl');
      
    })
    .catch(error => {
      console.error('❌ Ошибка создания CSV:', error);
    });
    
} catch (error) {
  console.error('❌ Ошибка:', error);
}