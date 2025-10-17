// Скрипт для добавления перевода "loadingExercises" во все языковые файлы

const fs = require('fs');
const path = require('path');

const translations = {
  pl: 'Ładowanie ćwiczeń...',
  sv: 'Laddar övningar...',
  cs: 'Načítání cvičení...',
  sk: 'Načítavanie cvičení...',
  fi: 'Ladataan harjoituksia...',
  it: 'Caricamento degli esercizi...',
  de: 'Übungen werden geladen...',
  fr: 'Chargement des exercices...',
  lt: 'Įkeliami pratimai...',
  lv: 'Ielādē vingrinājumus...'
};

const localesDir = path.join(__dirname, '..', 'locales');

Object.entries(translations).forEach(([lang, translation]) => {
  const filePath = path.join(localesDir, `${lang}.json`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️ Файл ${lang}.json не найден, пропускаем`);
    return;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(content);
  
  // Добавляем новый ключ в секцию exercises
  if (data.exercises) {
    // Находим позицию после loadingExercise
    const lines = content.split('\n');
    let newContent = '';
    let found = false;
    
    for (let i = 0; i < lines.length; i++) {
      newContent += lines[i] + '\n';
      
      // Ищем строку с "loadingExercise"
      if (!found && lines[i].includes('"loadingExercise"')) {
        // Добавляем новую строку после loadingExercise
        const indent = lines[i].match(/^\s*/)[0];
        newContent += `${indent}"loadingExercises": "${translation}",\n`;
        found = true;
      }
    }
    
    // Удаляем последний перенос строки
    newContent = newContent.slice(0, -1);
    
    if (found) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`✅ ${lang}.json обновлен: "${translation}"`);
    } else {
      console.log(`⚠️ ${lang}.json: не найден ключ "loadingExercise"`);
    }
  } else {
    console.log(`⚠️ ${lang}.json: нет секции "exercises"`);
  }
});

console.log('\n🎉 Готово!');








