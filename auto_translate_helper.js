const fs = require('fs');
const path = require('path');

// Функция для создания CSV файла для Google Sheets или других инструментов перевода
function createTranslationCSV(languageCode) {
  try {
    console.log(`📊 Создаем CSV файл для перевода на ${languageCode}`);
    
    // Загружаем ключи
    const keysPath = path.join(__dirname, 'translation_keys_for_new_language.json');
    if (!fs.existsSync(keysPath)) {
      console.log('❌ Сначала запустите: node analyze_translations.js');
      return;
    }
    
    const allKeys = JSON.parse(fs.readFileSync(keysPath, 'utf8'));
    
    // Создаем CSV контент
    let csvContent = 'Key,Russian,English,Translation\n';
    
    allKeys.forEach(item => {
      const key = item.key;
      const ru = (item.ru || '').replace(/"/g, '""'); // Экранируем кавычки
      const en = (item.en || '').replace(/"/g, '""');
      
      csvContent += `"${key}","${ru}","${en}",""\n`;
    });
    
    // Сохраняем CSV
    const csvPath = path.join(__dirname, `translation_${languageCode}.csv`);
    fs.writeFileSync(csvPath, csvContent, 'utf8');
    
    console.log(`✅ Создан файл: translation_${languageCode}.csv`);
    console.log(`📋 Содержит ${allKeys.length} строк для перевода`);
    console.log('');
    console.log('💡 КАК ИСПОЛЬЗОВАТЬ:');
    console.log('1. Откройте файл в Google Sheets или Excel');
    console.log('2. Заполните колонку "Translation"');
    console.log('3. Запустите: node import_translations_from_csv.js [файл.csv] [код_языка]');
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

// Функция для импорта переводов из CSV
function importTranslationsFromCSV(csvPath, languageCode) {
  try {
    console.log(`📥 Импортируем переводы из ${csvPath} для языка ${languageCode}`);
    
    if (!fs.existsSync(csvPath)) {
      console.log('❌ CSV файл не найден!');
      return;
    }
    
    // Читаем CSV
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.split('\n');
    const header = lines[0];
    
    if (!header.includes('Key') || !header.includes('Translation')) {
      console.log('❌ Неверный формат CSV! Нужны колонки Key и Translation');
      return;
    }
    
    // Парсим переводы
    const translations = {};
    
    function setNestedValue(obj, key, value) {
      const keys = key.split('.');
      let current = obj;
      
      for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i];
        if (!(k in current)) {
          current[k] = {};
        }
        current = current[k];
      }
      
      current[keys[keys.length - 1]] = value;
    }
    
    let importedCount = 0;
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Простой парсинг CSV (для более сложных случаев нужна библиотека)
      const matches = line.match(/"([^"]*)","([^"]*)","([^"]*)","([^"]*)"/);
      if (matches && matches.length >= 5) {
        const key = matches[1];
        const translation = matches[4];
        
        if (translation && translation.trim()) {
          setNestedValue(translations, key, translation.trim());
          importedCount++;
        }
      }
    }
    
    // Сохраняем файл переводов
    const outputPath = path.join(__dirname, 'locales', `${languageCode}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(translations, null, 2), 'utf8');
    
    console.log(`✅ Импортировано ${importedCount} переводов`);
    console.log(`✅ Создан файл: locales/${languageCode}.json`);
    
    // Обновляем LanguageContext.tsx если нужно
    const contextPath = path.join(__dirname, 'contexts', 'LanguageContext.tsx');
    let contextContent = fs.readFileSync(contextPath, 'utf8');
    
    if (!contextContent.includes(`${languageCode}Translations`)) {
      console.log('⚠️  Не забудьте обновить contexts/LanguageContext.tsx!');
      console.log(`   Добавьте: import ${languageCode}Translations from '../locales/${languageCode}.json';`);
    }
    
  } catch (error) {
    console.error('❌ Ошибка импорта:', error.message);
  }
}

// Проверяем аргументы
const command = process.argv[2];
const args = process.argv.slice(3);

if (command === 'csv') {
  if (args.length < 1) {
    console.log('Использование: node auto_translate_helper.js csv [код_языка]');
    process.exit(1);
  }
  createTranslationCSV(args[0]);
} else if (command === 'import') {
  if (args.length < 2) {
    console.log('Использование: node auto_translate_helper.js import [файл.csv] [код_языка]');
    process.exit(1);
  }
  importTranslationsFromCSV(args[0], args[1]);
} else {
  console.log('🛠️  ПОМОЩНИК АВТОМАТИЧЕСКОГО ПЕРЕВОДА');
  console.log('===================================');
  console.log('');
  console.log('📋 КОМАНДЫ:');
  console.log('node auto_translate_helper.js csv [код_языка]');
  console.log('  - Создает CSV файл для массового перевода');
  console.log('');
  console.log('node auto_translate_helper.js import [файл.csv] [код_языка]');
  console.log('  - Импортирует переводы из CSV файла');
  console.log('');
  console.log('🌍 ПРИМЕРЫ:');
  console.log('node auto_translate_helper.js csv de');
  console.log('node auto_translate_helper.js import translation_de_filled.csv de');
}
