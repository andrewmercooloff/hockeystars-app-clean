const fs = require('fs');
const path = require('path');

// Список языков для добавления
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

// Получаем язык из аргументов командной строки
const targetLanguage = process.argv[2];

if (!targetLanguage) {
  console.log('🌍 ДОБАВЛЕНИЕ ПОДДЕРЖКИ ЯЗЫКА');
  console.log('==============================');
  console.log('Использование: node add_language_support.js [язык]');
  console.log('\nПоддерживаемые языки:');
  languages.forEach((lang, index) => {
    console.log(`  ${index + 1}. ${lang.code} - ${lang.name}`);
  });
  process.exit(1);
}

const language = languages.find(lang => lang.code === targetLanguage);
if (!language) {
  console.log(`❌ Язык ${targetLanguage} не поддерживается!`);
  process.exit(1);
}

console.log(`🌍 ДОБАВЛЕНИЕ ПОДДЕРЖКИ ${language.name.toUpperCase()}`);
console.log('===============================================');

// Вспомогательные функции для получения переводов
function getYearWord(lang, num) {
  const translations = {
    'pl': num === 1 ? 'rok' : 'lat',
    'sv': num === 1 ? 'år' : 'år',
    'cs': num === 1 ? 'rok' : 'let',
    'sk': num === 1 ? 'rok' : 'rokov',
    'fi': num === 1 ? 'vuosi' : 'vuotta',
    'it': num === 1 ? 'anno' : 'anni',
    'de': num === 1 ? 'Jahr' : 'Jahre',
    'fr': num === 1 ? 'an' : 'ans'
  };
  return translations[lang] || 'year';
}

function getMonthWord(lang) {
  const translations = {
    'pl': 'mies.',
    'sv': 'mån.',
    'cs': 'měs.',
    'sk': 'mes.',
    'fi': 'kk',
    'it': 'mesi',
    'de': 'Mon.',
    'fr': 'mois'
  };
  return translations[lang] || 'mo.';
}

function getInHockeyPhrase(lang) {
  const translations = {
    'pl': 'w hokeju',
    'sv': 'i hockey',
    'cs': 'v hokeji',
    'sk': 'v hokeji',
    'fi': 'jääkiekossa',
    'it': 'nell\'hockey',
    'de': 'im Hockey',
    'fr': 'au hockey'
  };
  return translations[lang] || 'in hockey';
}

try {
  // 1. Обновляем LanguageContext.tsx
  console.log('📝 Обновляем LanguageContext.tsx...');
  const languageContextPath = path.join(__dirname, 'contexts', 'LanguageContext.tsx');
  let languageContextContent = fs.readFileSync(languageContextPath, 'utf8');
  
  // Добавляем импорт
  const importRegex = /import lvTranslations from '\.\.\/locales\/lv\.json';/;
  const newImport = `import lvTranslations from '../locales/lv.json';\nimport ${targetLanguage}Translations from '../locales/${targetLanguage}.json';`;
  languageContextContent = languageContextContent.replace(importRegex, newImport);
  
  // Обновляем тип Language
  const languageTypeRegex = /export type Language = 'ru' \| 'lt' \| 'lv' \| 'en';/;
  const newLanguageType = `export type Language = 'ru' | 'lt' | 'lv' | '${targetLanguage}' | 'en';`;
  languageContextContent = languageContextContent.replace(languageTypeRegex, newLanguageType);
  
  // Добавляем в объект translations
  const translationsRegex = /const translations = \{\s*ru: ruTranslations,\s*en: enTranslations,\s*lt: ltTranslations,\s*lv: lvTranslations,\s*\};/;
  const newTranslations = `const translations = {
  ru: ruTranslations,
  en: enTranslations,
  lt: ltTranslations,
  lv: lvTranslations,
  ${targetLanguage}: ${targetLanguage}Translations,
};`;
  languageContextContent = languageContextContent.replace(translationsRegex, newTranslations);
  
  // Обновляем проверку в loadSavedLanguage
  const loadSavedLanguageRegex = /if \(savedLanguage && \(savedLanguage === 'ru' \|\| savedLanguage === 'en' \|\| savedLanguage === 'lt' \|\| savedLanguage === 'lv'\)\)/;
  const newLoadSavedLanguage = `if (savedLanguage && (savedLanguage === 'ru' || savedLanguage === 'en' || savedLanguage === 'lt' || savedLanguage === 'lv' || savedLanguage === '${targetLanguage}'))`;
  languageContextContent = languageContextContent.replace(loadSavedLanguageRegex, newLoadSavedLanguage);
  
  fs.writeFileSync(languageContextPath, languageContextContent);
  console.log('✅ LanguageContext.tsx обновлен');
  
  // 2. Обновляем LanguageSwitcher.tsx
  console.log('📝 Обновляем LanguageSwitcher.tsx...');
  const languageSwitcherPath = path.join(__dirname, 'components', 'LanguageSwitcher.tsx');
  let languageSwitcherContent = fs.readFileSync(languageSwitcherPath, 'utf8');
  
  // Добавляем язык в массив languages
  const languagesArrayRegex = /const languages = \[[\s\S]*?\];/;
  const newLanguagesArray = `const languages = [
    { code: 'ru', name: 'Русский' },
    { code: 'en', name: 'English' },
    { code: 'lt', name: 'Lietuvių' },
    { code: 'lv', name: 'Latviešu' },
    { code: '${targetLanguage}', name: '${language.name}' },
  ];`;
  languageSwitcherContent = languageSwitcherContent.replace(languagesArrayRegex, newLanguagesArray);
  
  // Обновляем тип в handleLanguageSelect
  const handleLanguageSelectRegex = /const handleLanguageSelect = \(langCode: 'ru' \| 'en' \| 'lt' \| 'lv'\) =>/;
  const newHandleLanguageSelect = `const handleLanguageSelect = (langCode: 'ru' | 'en' | 'lt' | 'lv' | '${targetLanguage}') =>`;
  languageSwitcherContent = languageSwitcherContent.replace(handleLanguageSelectRegex, newHandleLanguageSelect);
  
  // Обновляем onPress
  const onPressRegex = /onPress=\{\(\) => handleLanguageSelect\(lang\.code as 'ru' \| 'en' \| 'lt' \| 'lv'\)\}/;
  const newOnPress = `onPress={() => handleLanguageSelect(lang.code as 'ru' | 'en' | 'lt' | 'lv' | '${targetLanguage}')}`;
  languageSwitcherContent = languageSwitcherContent.replace(onPressRegex, newOnPress);
  
  fs.writeFileSync(languageSwitcherPath, languageSwitcherContent);
  console.log('✅ LanguageSwitcher.tsx обновлен');
  
  // 3. Обновляем types/exercise.ts
  console.log('📝 Обновляем types/exercise.ts...');
  const exerciseTypesPath = path.join(__dirname, 'types', 'exercise.ts');
  let exerciseTypesContent = fs.readFileSync(exerciseTypesPath, 'utf8');
  
  // Обновляем тип Language
  const exerciseLanguageTypeRegex = /export type Language = 'ru' \| 'en' \| 'lt' \| 'lv';/;
  const newExerciseLanguageType = `export type Language = 'ru' | 'en' | 'lt' | 'lv' | '${targetLanguage}';`;
  exerciseTypesContent = exerciseTypesContent.replace(exerciseLanguageTypeRegex, newExerciseLanguageType);
  
  // Добавляем импорт в getExerciseTranslationFromLocales
  const importTranslationsRegex = /const lvTranslations = require\('\.\.\/locales\/lv\.json'\);/;
  const newImportTranslations = `const lvTranslations = require('../locales/lv.json');
    const ${targetLanguage}Translations = require('../locales/${targetLanguage}.json');`;
  exerciseTypesContent = exerciseTypesContent.replace(importTranslationsRegex, newImportTranslations);
  
  // Добавляем условие для нового языка
  const translationsConditionRegex = /} else if \(language === 'lv'\) \{\s*translations = lvTranslations;\s*\} else/;
  const newTranslationsCondition = `} else if (language === 'lv') {
      translations = lvTranslations;
    } else if (language === '${targetLanguage}') {
      translations = ${targetLanguage}Translations;
    } else`;
  exerciseTypesContent = exerciseTypesContent.replace(translationsConditionRegex, newTranslationsCondition);
  
  // Обновляем условие в getValueWithFallback
  const getValueWithFallbackRegex = /if \(language === 'lt' \|\| language === 'lv'\)/;
  const newGetValueWithFallback = `if (language === 'lt' || language === 'lv' || language === '${targetLanguage}')`;
  exerciseTypesContent = exerciseTypesContent.replace(getValueWithFallbackRegex, newGetValueWithFallback);
  
  fs.writeFileSync(exerciseTypesPath, exerciseTypesContent);
  console.log('✅ types/exercise.ts обновлен');
  
  // 4. Обновляем utils/playerStorage.ts
  console.log('📝 Обновляем utils/playerStorage.ts...');
  const playerStoragePath = path.join(__dirname, 'utils', 'playerStorage.ts');
  let playerStorageContent = fs.readFileSync(playerStoragePath, 'utf8');
  
  // Добавляем поддержку нового языка в getYearWord
  const getYearWordRegex = /} else if \(lang === 'lv'\) \{\s*\/\/ Латышский язык\s*if \(num === 1\) return 'gads';\s*return 'gadi';\s*\} else/;
  const newGetYearWord = `} else if (lang === 'lv') {
        // Латышский язык
        if (num === 1) return 'gads';
        return 'gadi';
      } else if (lang === '${targetLanguage}') {
        // ${language.name} язык
        if (num === 1) return '${getYearWord(targetLanguage, 1)}';
        return '${getYearWord(targetLanguage, 2)}';
      } else`;
  playerStorageContent = playerStorageContent.replace(getYearWordRegex, newGetYearWord);
  
  // Добавляем поддержку нового языка в getMonthWord
  const getMonthWordRegex = /if \(lang === 'lv'\) return 'mēn\.';/;
  const newGetMonthWord = `if (lang === 'lv') return 'mēn.';
      if (lang === '${targetLanguage}') return '${getMonthWord(targetLanguage)}';`;
  playerStorageContent = playerStorageContent.replace(getMonthWordRegex, newGetMonthWord);
  
  // Добавляем поддержку нового языка в getInHockeyPhrase
  const getInHockeyPhraseRegex = /if \(lang === 'lv'\) return 'hokejā';/;
  const newGetInHockeyPhrase = `if (lang === 'lv') return 'hokejā';
      if (lang === '${targetLanguage}') return '${getInHockeyPhrase(targetLanguage)}';`;
  playerStorageContent = playerStorageContent.replace(getInHockeyPhraseRegex, newGetInHockeyPhrase);
  
  fs.writeFileSync(playerStoragePath, playerStorageContent);
  console.log('✅ utils/playerStorage.ts обновлен');
  
  console.log(`\n🎉 Поддержка ${language.name} успешно добавлена!`);
  console.log(`💡 Следующие шаги:`);
  console.log(`   1. Перезапустите приложение`);
  console.log(`   2. Проверьте работу нового языка`);
  console.log(`   3. При необходимости добавьте склонения для опыта в хоккее`);
  
} catch (error) {
  console.error('❌ Ошибка:', error);
}