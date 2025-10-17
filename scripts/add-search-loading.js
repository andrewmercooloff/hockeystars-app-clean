// Скрипт для добавления перевода "search.loading" во все языковые файлы

const fs = require('fs');
const path = require('path');

const translations = {
  en: 'Loading search...',
  pl: 'Ładowanie wyszukiwania...',
  sv: 'Laddar sökning...',
  cs: 'Načítání vyhledávání...',
  sk: 'Načítavanie vyhľadávania...',
  fi: 'Ladataan hakua...',
  it: 'Caricamento della ricerca...',
  de: 'Suche wird geladen...',
  fr: 'Chargement de la recherche...',
  lt: 'Įkeliama paieška...',
  lv: 'Ielādē meklēšanu...'
};

const localesDir = path.join(__dirname, '..', 'locales');

Object.entries(translations).forEach(([lang, translation]) => {
  const filePath = path.join(localesDir, `${lang}.json`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️ Файл ${lang}.json не найден, пропускаем`);
    return;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  let newContent = '';
  let found = false;
  
  for (let i = 0; i < lines.length; i++) {
    newContent += lines[i] + '\n';
    
    // Ищем строку с "search": { и "title"
    if (!found && lines[i].includes('"search"') && lines[i].includes('{')) {
      // Следующая строка должна быть с "title"
      if (i + 1 < lines.length && lines[i + 1].includes('"title"')) {
        // Добавляем новую строку после title
        newContent += lines[i + 1] + '\n';
        const indent = lines[i + 1].match(/^\s*/)[0];
        newContent += `${indent}"loading": "${translation}",\n`;
        i++; // Пропускаем строку с title, так как уже добавили
        found = true;
      }
    }
  }
  
  // Удаляем последний перенос строки
  newContent = newContent.slice(0, -1);
  
  if (found) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`✅ ${lang}.json обновлен: "${translation}"`);
  } else {
    console.log(`⚠️ ${lang}.json: не найдена секция "search"`);
  }
});

console.log('\n🎉 Готово!');








