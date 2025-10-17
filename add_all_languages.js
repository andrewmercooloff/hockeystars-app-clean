const fs = require('fs');
const path = require('path');

// Список всех языков для добавления
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

console.log('🌍 МАССОВОЕ ДОБАВЛЕНИЕ ПОДДЕРЖКИ ВСЕХ ЯЗЫКОВ');
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
  
  // 2. Обновляем LanguageSwitcher.tsx
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
  
  // 3. Обновляем types/exercise.ts
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
  
  // 4. Обновляем utils/playerStorage.ts
  console.log('📝 Обновляем utils/playerStorage.ts...');
  const playerStoragePath = path.join(__dirname, 'utils', 'playerStorage.ts');
  let playerStorageContent = fs.readFileSync(playerStoragePath, 'utf8');
  
  // Добавляем поддержку всех языков в getYearWord
  const getYearWordRegex = /} else if \(lang === 'lv'\) \{\s*\/\/ Латышский язык\s*if \(num === 1\) return 'gads';\s*return 'gadi';\s*\} else/;
  const allYearWordConditions = languages.map(lang => `      } else if (lang === '${lang.code}') {\n        // ${lang.name} язык\n        if (num === 1) return '${getYearWord(lang.code, 1)}';\n        return '${getYearWord(lang.code, 2)}';`).join('\n');
  const newGetYearWord = `} else if (lang === 'lv') {
        // Латышский язык
        if (num === 1) return 'gads';
        return 'gadi';
${allYearWordConditions}
      } else`;
  playerStorageContent = playerStorageContent.replace(getYearWordRegex, newGetYearWord);
  
  // Добавляем поддержку всех языков в getMonthWord
  const getMonthWordRegex = /if \(lang === 'lv'\) return 'mēn\.';/;
  const allMonthWordConditions = languages.map(lang => `      if (lang === '${lang.code}') return '${getMonthWord(lang.code)}';`).join('\n');
  const newGetMonthWord = `if (lang === 'lv') return 'mēn.';
${allMonthWordConditions}`;
  playerStorageContent = playerStorageContent.replace(getMonthWordRegex, newGetMonthWord);
  
  // Добавляем поддержку всех языков в getInHockeyPhrase
  const getInHockeyPhraseRegex = /if \(lang === 'lv'\) return 'hokejā';/;
  const allInHockeyPhraseConditions = languages.map(lang => `      if (lang === '${lang.code}') return '${getInHockeyPhrase(lang.code)}';`).join('\n');
  const newGetInHockeyPhrase = `if (lang === 'lv') return 'hokejā';
${allInHockeyPhraseConditions}`;
  playerStorageContent = playerStorageContent.replace(getInHockeyPhraseRegex, newGetInHockeyPhrase);
  
  fs.writeFileSync(playerStoragePath, playerStorageContent);
  console.log('✅ utils/playerStorage.ts обновлен');
  
  console.log(`\n🎉 Поддержка всех ${languages.length} языков успешно добавлена!`);
  console.log(`📊 Добавленные языки:`);
  languages.forEach((lang, index) => {
    console.log(`   ${index + 1}. ${lang.name} (${lang.code})`);
  });
  console.log(`\n💡 Следующие шаги:`);
  console.log(`   1. Перезапустите приложение`);
  console.log(`   2. Проверьте работу всех языков`);
  console.log(`   3. При необходимости добавьте склонения для опыта в хоккее`);
  
} catch (error) {
  console.error('❌ Ошибка:', error);
}
