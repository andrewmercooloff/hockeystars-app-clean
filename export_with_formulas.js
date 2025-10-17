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
      // Добавляем формулы Google Translate для всех языков
      ...languages.reduce((acc, lang) => {
        acc[lang.code] = `=GOOGLETRANSLATE(B${allTranslations.length + 2},"ru","${lang.code}")`;
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
  console.log('🌍 ЭКСПОРТ ТАБЛИЦЫ С ГОТОВЫМИ ФОРМУЛАМИ GOOGLE TRANSLATE');
  console.log('=======================================================');
  
  // Загружаем русский файл
  const ruPath = path.join(__dirname, 'locales', 'ru.json');
  const ruData = JSON.parse(fs.readFileSync(ruPath, 'utf8'));
  
  // Извлекаем все русские переводы с формулами
  const allRussianTranslations = extractAllRussianTranslations(ruData);
  
  console.log(`📊 Найдено ${allRussianTranslations.length} ключей в русском файле`);
  
  // Создаем заголовки для CSV
  const headers = [
    {id: 'key', title: 'KEY'},
    {id: 'russian', title: 'RUSSIAN'},
    ...languages.map(lang => ({id: lang.code, title: lang.name}))
  ];
  
  // Настройка CSV-файла
  const csvWriter = createCsvWriter({
    path: path.join(__dirname, 'multi_language_with_formulas.csv'),
    header: headers
  });
  
  // Запись в CSV
  csvWriter.writeRecords(allRussianTranslations)
    .then(() => {
      console.log('✅ CSV-файл с формулами создан: multi_language_with_formulas.csv');
      console.log('\n💡 ИНСТРУКЦИИ:');
      console.log('1. Откройте файл multi_language_with_formulas.csv в Google Sheets');
      console.log('2. Формулы уже вставлены! Просто растяните их:');
      console.log('   - Выделите ячейки с формулами (столбцы C-J)');
      console.log('   - Потяните за правый нижний угол до конца таблицы');
      console.log('   - Или используйте Ctrl+D для копирования вниз');
      console.log('3. Дождитесь завершения перевода (может занять несколько минут)');
      console.log('4. Скопируйте и вставьте как значения (без формул):');
      console.log('   - Выделите все переведенные ячейки');
      console.log('   - Ctrl+C для копирования');
      console.log('   - Правый клик → "Вставить только значения"');
      console.log('5. Сохраните как CSV');
      console.log('6. Используйте: node import_multi_language.js [язык]');
      
      console.log('\n📝 В файле включены все наши доработки:');
      console.log('   ✅ Категории упражнений (Endurance, Balance и т.д.)');
      console.log('   ✅ Сложность (Beginner, Intermediate, Advanced)');
      console.log('   ✅ Типы подарков (autograph, stick, puck, jersey)');
      console.log('   ✅ Опыт игрока в хоккее');
      console.log('   ✅ Все упражнения с деталями');
      console.log('   ✅ Все интерфейсные элементы');
      
      console.log('\n🎯 Языки для перевода:');
      languages.forEach((lang, index) => {
        console.log(`${index + 1}. ${lang.name} (${lang.code})`);
      });
      
      console.log('\n🚀 После перевода используйте:');
      console.log('   node import_multi_language.js pl');
      console.log('   node import_multi_language.js sv');
      console.log('   node import_multi_language.js cs');
      console.log('   node import_multi_language.js sk');
      console.log('   node import_multi_language.js fi');
      console.log('   node import_multi_language.js it');
      console.log('   node import_multi_language.js de');
      console.log('   node import_multi_language.js fr');
      
    })
    .catch(error => {
      console.error('❌ Ошибка создания CSV:', error);
    });
    
} catch (error) {
  console.error('❌ Ошибка:', error);
}
