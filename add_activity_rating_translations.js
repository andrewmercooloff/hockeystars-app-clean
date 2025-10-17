const fs = require('fs');
const path = require('path');

// Переводы для системы рейтинга активности
const translations = {
  ru: {
    activityRating: 'Рейтинг активности'
  },
  en: {
    activityRating: 'Activity Rating'
  },
  lt: {
    activityRating: 'Aktyvumo reitingas'
  },
  lv: {
    activityRating: 'Aktivitātes reitings'
  },
  pl: {
    activityRating: 'Ocena aktywności'
  },
  sv: {
    activityRating: 'Aktivitetsbetyg'
  },
  cs: {
    activityRating: 'Hodnocení aktivity'
  },
  sk: {
    activityRating: 'Hodnotenie aktivity'
  },
  fi: {
    activityRating: 'Aktiivisuusluokitus'
  },
  it: {
    activityRating: 'Valutazione attività'
  },
  de: {
    activityRating: 'Aktivitätsbewertung'
  },
  fr: {
    activityRating: 'Évaluation d\'activité'
  }
};

// Обновление файлов переводов
Object.keys(translations).forEach(lang => {
  const filePath = path.join(__dirname, 'locales', `${lang}.json`);
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const json = JSON.parse(content);
    
    // Добавляем переводы в секцию profile
    if (!json.profile) {
      json.profile = {};
    }
    
    json.profile.activityRating = translations[lang].activityRating;
    
    // Записываем обратно в файл
    fs.writeFileSync(filePath, JSON.stringify(json, null, 2), 'utf8');
    console.log(`✓ Updated ${lang}.json`);
  } catch (error) {
    console.error(`✗ Error updating ${lang}.json:`, error.message);
  }
});

console.log('\n✅ Activity rating translations added to all language files!');
