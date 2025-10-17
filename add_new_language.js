const fs = require('fs');
const path = require('path');

// Функция для создания вложенного объекта из плоского ключа
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

// Функция для добавления нового языка
function addNewLanguage(languageCode, languageName) {
  try {
    console.log(`🌍 Добавляем новый язык: ${languageName} (${languageCode})`);
    console.log('================================================');
    
    // 1. Загружаем список всех ключей
    const keysPath = path.join(__dirname, 'translation_keys_for_new_language.json');
    if (!fs.existsSync(keysPath)) {
      console.log('❌ Файл translation_keys_for_new_language.json не найден!');
      console.log('💡 Сначала запустите: node analyze_translations.js');
      return;
    }
    
    const allKeys = JSON.parse(fs.readFileSync(keysPath, 'utf8'));
    console.log(`📋 Загружено ${allKeys.length} ключей для перевода`);
    
    // 2. Создаем новый объект переводов
    const newTranslations = {};
    
    // Используем русские значения как базу (можно изменить на английские)
    allKeys.forEach(item => {
      const baseValue = item.ru || item.en || item.key;
      setNestedValue(newTranslations, item.key, baseValue);
    });
    
    // 3. Сохраняем файл нового языка
    const newLanguagePath = path.join(__dirname, 'locales', `${languageCode}.json`);
    fs.writeFileSync(newLanguagePath, JSON.stringify(newTranslations, null, 2), 'utf8');
    console.log(`✅ Создан файл: locales/${languageCode}.json`);
    
    // 4. Обновляем LanguageContext.tsx
    const contextPath = path.join(__dirname, 'contexts', 'LanguageContext.tsx');
    let contextContent = fs.readFileSync(contextPath, 'utf8');
    
    // Добавляем импорт
    const importLine = `import ${languageCode}Translations from '../locales/${languageCode}.json';`;
    if (!contextContent.includes(importLine)) {
      contextContent = contextContent.replace(
        /import enTranslations from '\.\.\/locales\/en\.json';/,
        `import enTranslations from '../locales/en.json';\n${importLine}`
      );
    }
    
    // Обновляем тип Language
    const oldTypeRegex = /export type Language = '[^']+'/;
    const currentLanguages = contextContent.match(/export type Language = '([^']+)'/)?.[1] || 'ru';
    if (!currentLanguages.includes(languageCode)) {
      const newType = `export type Language = '${currentLanguages}' | '${languageCode}'`;
      contextContent = contextContent.replace(oldTypeRegex, newType);
    }
    
    // Добавляем в объект translations
    const translationsRegex = /const translations = \{([^}]+)\};/s;
    const translationsMatch = contextContent.match(translationsRegex);
    if (translationsMatch && !translationsMatch[1].includes(`${languageCode}:`)) {
      const newTranslationsObj = translationsMatch[1].trim() + `,\n  ${languageCode}: ${languageCode}Translations,`;
      contextContent = contextContent.replace(
        translationsRegex,
        `const translations = {\n  ${newTranslationsObj}\n};`
      );
    }
    
    // Обновляем проверку в loadSavedLanguage
    const validationRegex = /savedLanguage === 'ru' \|\| savedLanguage === 'en'/;
    if (!contextContent.includes(`savedLanguage === '${languageCode}'`)) {
      contextContent = contextContent.replace(
        validationRegex,
        `savedLanguage === 'ru' || savedLanguage === 'en' || savedLanguage === '${languageCode}'`
      );
    }
    
    fs.writeFileSync(contextPath, contextContent, 'utf8');
    console.log(`✅ Обновлен файл: contexts/LanguageContext.tsx`);
    
    // 5. Создаем файл со списком ключей для переводчика
    const translatorPath = path.join(__dirname, `keys_to_translate_${languageCode}.txt`);
    const keysForTranslator = allKeys.map(item => {
      const baseValue = item.ru || item.en || item.key;
      return `${item.key} = "${baseValue}"`;
    }).join('\n');
    
    fs.writeFileSync(translatorPath, keysForTranslator, 'utf8');
    console.log(`📝 Создан файл для переводчика: keys_to_translate_${languageCode}.txt`);
    
    console.log('');
    console.log('🎉 ЯЗЫК УСПЕШНО ДОБАВЛЕН!');
    console.log('========================');
    console.log('');
    console.log('📋 ЧТО СДЕЛАНО:');
    console.log(`✅ Создан locales/${languageCode}.json с базовыми переводами`);
    console.log('✅ Обновлен contexts/LanguageContext.tsx');
    console.log(`✅ Создан keys_to_translate_${languageCode}.txt для переводчика`);
    console.log('');
    console.log('🔄 ЧТО НУЖНО СДЕЛАТЬ:');
    console.log(`1. Перевести все строки в locales/${languageCode}.json`);
    console.log(`2. Или использовать keys_to_translate_${languageCode}.txt для массового перевода`);
    console.log('3. Добавить переключатель языка в UI (если нужно)');
    console.log('4. Перезапустить приложение');
    console.log('');
    console.log('💡 СОВЕТ: Можно использовать Google Translate API или ChatGPT для автоматического перевода!');
    
  } catch (error) {
    console.error('❌ Ошибка при добавлении языка:', error.message);
  }
}

// Проверяем аргументы командной строки
const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('📖 ИСПОЛЬЗОВАНИЕ:');
  console.log('node add_new_language.js [код_языка] [название_языка]');
  console.log('');
  console.log('🌍 ПРИМЕРЫ:');
  console.log('node add_new_language.js de "German"');
  console.log('node add_new_language.js fr "French"');
  console.log('node add_new_language.js es "Spanish"');
  console.log('node add_new_language.js it "Italian"');
  console.log('node add_new_language.js pl "Polish"');
  console.log('node add_new_language.js uk "Ukrainian"');
  console.log('node add_new_language.js be "Belarusian"');
  console.log('');
  console.log('💡 Сначала запустите: node analyze_translations.js');
  process.exit(1);
}

const [languageCode, languageName] = args;
addNewLanguage(languageCode, languageName);
