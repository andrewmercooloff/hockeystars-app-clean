const fs = require('fs');
const path = require('path');

console.log('🚀 БЫСТРОЕ ДОБАВЛЕНИЕ ВСЕХ 8 ЯЗЫКОВ');
console.log('====================================');

// Список всех языков
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

// Создаем пустые файлы локализации для всех языков
console.log('📝 Создаем пустые файлы локализации...');
languages.forEach(lang => {
  const filePath = path.join(__dirname, 'locales', `${lang.code}.json`);
  const emptyContent = `{
  "common": {
    "save": "Сохранить",
    "cancel": "Отмена",
    "edit": "Редактировать",
    "delete": "Удалить"
  }
}`;
  fs.writeFileSync(filePath, emptyContent, 'utf8');
  console.log(`✅ Создан locales/${lang.code}.json`);
});

// Обновляем LanguageContext.tsx
console.log('📝 Обновляем LanguageContext.tsx...');
const languageContextPath = path.join(__dirname, 'contexts', 'LanguageContext.tsx');
let languageContextContent = fs.readFileSync(languageContextPath, 'utf8');

// Добавляем все импорты
const importRegex = /import lvTranslations from '\.\.\/locales\/lv\.json';/;
const allImports = languages.map(lang => `import ${lang.code}Translations from '../locales/${lang.code}.json';`).join('\n');
const newImport = `import lvTranslations from '../locales/lv.json';\n${allImports}`;
languageContextContent = languageContextContent.replace(importRegex, newImport);

// Обновляем тип Language
const languageTypeRegex = /export type Language = 'ru' \| 'lt' \| 'lv' \| 'en';/;
const allLanguageCodes = ['ru', 'lt', 'lv', ...languages.map(lang => lang.code), 'en'].join(' | ');
const newLanguageType = `export type Language = '${allLanguageCodes}';`;
languageContextContent = languageContextContent.replace(languageTypeRegex, newLanguageType);

// Добавляем в объект translations
const translationsRegex = /const translations = \{\s*ru: ruTranslations,\s*en: enTranslations,\s*lt: ltTranslations,\s*lv: lvTranslations,\s*\};/;
const allTranslations = languages.map(lang => `  ${lang.code}: ${lang.code}Translations,`).join('\n');
const newTranslations = `const translations = {
  ru: ruTranslations,
  en: enTranslations,
  lt: ltTranslations,
  lv: lvTranslations,
${allTranslations}
};`;
languageContextContent = languageContextContent.replace(translationsRegex, newTranslations);

// Обновляем проверку в loadSavedLanguage
const loadSavedLanguageRegex = /if \(savedLanguage && \(savedLanguage === 'ru' \|\| savedLanguage === 'en' \|\| savedLanguage === 'lt' \|\| savedLanguage === 'lv'\)\)/;
const allLanguageChecks = ['ru', 'en', 'lt', 'lv', ...languages.map(lang => lang.code)].map(code => `savedLanguage === '${code}'`).join(' || ');
const newLoadSavedLanguage = `if (savedLanguage && (${allLanguageChecks}))`;
languageContextContent = languageContextContent.replace(loadSavedLanguageRegex, newLoadSavedLanguage);

fs.writeFileSync(languageContextPath, languageContextContent);
console.log('✅ LanguageContext.tsx обновлен');

// Обновляем LanguageSwitcher.tsx
console.log('📝 Обновляем LanguageSwitcher.tsx...');
const languageSwitcherPath = path.join(__dirname, 'components', 'LanguageSwitcher.tsx');
let languageSwitcherContent = fs.readFileSync(languageSwitcherPath, 'utf8');

// Добавляем все языки в массив languages
const languagesArrayRegex = /const languages = \[[\s\S]*?\];/;
const allLanguagesArray = languages.map(lang => `    { code: '${lang.code}', name: '${lang.name}' }`).join(',\n');
const newLanguagesArray = `const languages = [
    { code: 'ru', name: 'Русский' },
    { code: 'en', name: 'English' },
    { code: 'lt', name: 'Lietuvių' },
    { code: 'lv', name: 'Latviešu' },
${allLanguagesArray},
  ];`;
languageSwitcherContent = languageSwitcherContent.replace(languagesArrayRegex, newLanguagesArray);

// Обновляем тип в handleLanguageSelect
const handleLanguageSelectRegex = /const handleLanguageSelect = \(langCode: 'ru' \| 'en' \| 'lt' \| 'lv'\) =>/;
const allLanguageTypes = ['ru', 'en', 'lt', 'lv', ...languages.map(lang => lang.code)].map(code => `'${code}'`).join(' | ');
const newHandleLanguageSelect = `const handleLanguageSelect = (langCode: ${allLanguageTypes}) =>`;
languageSwitcherContent = languageSwitcherContent.replace(handleLanguageSelectRegex, newHandleLanguageSelect);

// Обновляем onPress
const onPressRegex = /onPress=\{\(\) => handleLanguageSelect\(lang\.code as 'ru' \| 'en' \| 'lt' \| 'lv'\)\}/;
const newOnPress = `onPress={() => handleLanguageSelect(lang.code as ${allLanguageTypes})}`;
languageSwitcherContent = languageSwitcherContent.replace(onPressRegex, newOnPress);

fs.writeFileSync(languageSwitcherPath, languageSwitcherContent);
console.log('✅ LanguageSwitcher.tsx обновлен');

// Обновляем types/exercise.ts
console.log('📝 Обновляем types/exercise.ts...');
const exerciseTypesPath = path.join(__dirname, 'types', 'exercise.ts');
let exerciseTypesContent = fs.readFileSync(exerciseTypesPath, 'utf8');

// Обновляем тип Language
const exerciseLanguageTypeRegex = /export type Language = 'ru' \| 'en' \| 'lt' \| 'lv';/;
const newExerciseLanguageType = `export type Language = '${allLanguageCodes}';`;
exerciseTypesContent = exerciseTypesContent.replace(exerciseLanguageTypeRegex, newExerciseLanguageType);

// Добавляем все импорты в getExerciseTranslationFromLocales
const importTranslationsRegex = /const lvTranslations = require\('\.\.\/locales\/lv\.json'\);/;
const allImportTranslations = languages.map(lang => `    const ${lang.code}Translations = require('../locales/${lang.code}.json');`).join('\n');
const newImportTranslations = `const lvTranslations = require('../locales/lv.json');
${allImportTranslations}`;
exerciseTypesContent = exerciseTypesContent.replace(importTranslationsRegex, newImportTranslations);

// Добавляем условия для всех языков
const translationsConditionRegex = /} else if \(language === 'lv'\) \{\s*translations = lvTranslations;\s*\} else/;
const allLanguageConditions = languages.map(lang => `    } else if (language === '${lang.code}') {\n      translations = ${lang.code}Translations;`).join('\n');
const newTranslationsCondition = `} else if (language === 'lv') {
      translations = lvTranslations;
${allLanguageConditions}
    } else`;
exerciseTypesContent = exerciseTypesContent.replace(translationsConditionRegex, newTranslationsCondition);

// Обновляем условие в getValueWithFallback
const getValueWithFallbackRegex = /if \(language === 'lt' \|\| language === 'lv'\)/;
const allLanguageChecksForFallback = ['lt', 'lv', ...languages.map(lang => lang.code)].map(code => `language === '${code}'`).join(' || ');
const newGetValueWithFallback = `if (${allLanguageChecksForFallback})`;
exerciseTypesContent = exerciseTypesContent.replace(getValueWithFallbackRegex, newGetValueWithFallback);

fs.writeFileSync(exerciseTypesPath, exerciseTypesContent);
console.log('✅ types/exercise.ts обновлен');

// Обновляем utils/playerStorage.ts
console.log('📝 Обновляем utils/playerStorage.ts...');
const playerStoragePath = path.join(__dirname, 'utils', 'playerStorage.ts');
let playerStorageContent = fs.readFileSync(playerStoragePath, 'utf8');

// Добавляем поддержку всех языков в getYearWord
const getYearWordRegex = /} else if \(lang === 'lv'\) \{\s*\/\/ Латышский язык\s*if \(num === 1\) return 'gads';\s*return 'gadi';\s*\} else/;
const allYearWordConditions = languages.map(lang => {
  const yearWords = {
    'pl': { 1: 'rok', 2: 'lat' },
    'sv': { 1: 'år', 2: 'år' },
    'cs': { 1: 'rok', 2: 'let' },
    'sk': { 1: 'rok', 2: 'rokov' },
    'fi': { 1: 'vuosi', 2: 'vuotta' },
    'it': { 1: 'anno', 2: 'anni' },
    'de': { 1: 'Jahr', 2: 'Jahre' },
    'fr': { 1: 'an', 2: 'ans' }
  };
  const words = yearWords[lang.code] || { 1: 'year', 2: 'years' };
  return `      } else if (lang === '${lang.code}') {\n        // ${lang.name} язык\n        if (num === 1) return '${words[1]}';\n        return '${words[2]}';`;
}).join('\n');
const newGetYearWord = `} else if (lang === 'lv') {
        // Латышский язык
        if (num === 1) return 'gads';
        return 'gadi';
${allYearWordConditions}
      } else`;
playerStorageContent = playerStorageContent.replace(getYearWordRegex, newGetYearWord);

// Добавляем поддержку всех языков в getMonthWord
const getMonthWordRegex = /if \(lang === 'lv'\) return 'mēn\.';/;
const allMonthWordConditions = languages.map(lang => {
  const monthWords = {
    'pl': 'mies.',
    'sv': 'mån.',
    'cs': 'měs.',
    'sk': 'mes.',
    'fi': 'kk',
    'it': 'mesi',
    'de': 'Mon.',
    'fr': 'mois'
  };
  return `      if (lang === '${lang.code}') return '${monthWords[lang.code] || 'mo.'}';`;
}).join('\n');
const newGetMonthWord = `if (lang === 'lv') return 'mēn.';
${allMonthWordConditions}`;
playerStorageContent = playerStorageContent.replace(getMonthWordRegex, newGetMonthWord);

// Добавляем поддержку всех языков в getInHockeyPhrase
const getInHockeyPhraseRegex = /if \(lang === 'lv'\) return 'hokejā';/;
const allInHockeyPhraseConditions = languages.map(lang => {
  const hockeyPhrases = {
    'pl': 'w hokeju',
    'sv': 'i hockey',
    'cs': 'v hokeji',
    'sk': 'v hokeji',
    'fi': 'jääkiekossa',
    'it': 'nell\'hockey',
    'de': 'im Hockey',
    'fr': 'au hockey'
  };
  return `      if (lang === '${lang.code}') return '${hockeyPhrases[lang.code] || 'in hockey'}';`;
}).join('\n');
const newGetInHockeyPhrase = `if (lang === 'lv') return 'hokejā';
${allInHockeyPhraseConditions}`;
playerStorageContent = playerStorageContent.replace(getInHockeyPhraseRegex, newGetInHockeyPhrase);

fs.writeFileSync(playerStoragePath, playerStorageContent);
console.log('✅ utils/playerStorage.ts обновлен');

console.log(`\n🎉 ВСЕ 8 ЯЗЫКОВ УСПЕШНО ДОБАВЛЕНЫ!`);
console.log(`📊 Добавленные языки:`);
languages.forEach((lang, index) => {
  console.log(`   ${index + 1}. ${lang.name} (${lang.code})`);
});
console.log(`\n💡 Следующие шаги:`);
console.log(`   1. Перезапустите приложение: npx expo start --clear`);
console.log(`   2. Проверьте работу всех языков в переключателе`);
console.log(`   3. Переведите содержимое файлов locales/*.json`);
console.log(`   4. Используйте multi_language_translation.csv для массового перевода`);

console.log(`\n🚀 Готово! Теперь у вас 12 языков в приложении!`);
