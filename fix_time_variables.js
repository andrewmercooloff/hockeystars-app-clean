const fs = require('fs');
const path = require('path');

const languages = ['pl', 'sv', 'cs', 'sk', 'fi', 'it', 'de', 'fr'];

const timeFixes = {
  pl: {
    'minutesAgo': '{minutes} minut temu',
    'hoursAgo': '{hours} godzin temu', 
    'daysAgo': '{days} dni temu'
  },
  sv: {
    'minutesAgo': 'för {minutes} minuter sedan',
    'hoursAgo': 'för {hours} timmar sedan',
    'daysAgo': 'för {days} dagar sedan'
  },
  cs: {
    'minutesAgo': 'před {minutes} minutami',
    'hoursAgo': 'před {hours} hodinami',
    'daysAgo': 'před {days} dny'
  },
  sk: {
    'minutesAgo': 'pred {minutes} minútami',
    'hoursAgo': 'pred {hours} hodinami',
    'daysAgo': 'pred {days} dňami'
  },
  fi: {
    'minutesAgo': '{minutes} minuuttia sitten',
    'hoursAgo': '{hours} tuntia sitten',
    'daysAgo': '{days} päivää sitten'
  },
  it: {
    'minutesAgo': '{minutes} minuti fa',
    'hoursAgo': '{hours} ore fa',
    'daysAgo': '{days} giorni fa'
  },
  de: {
    'minutesAgo': 'vor {minutes} Minuten',
    'hoursAgo': 'vor {hours} Stunden',
    'daysAgo': 'vor {days} Tagen'
  },
  fr: {
    'minutesAgo': 'Il y a {minutes} minutes',
    'hoursAgo': 'Il y a {hours} heures',
    'daysAgo': 'Il y a {days} jours'
  }
};

console.log('🕐 ИСПРАВЛЕНИЕ ПЕРЕМЕННЫХ ВРЕМЕНИ В УВЕДОМЛЕНИЯХ');
console.log('===============================================');

languages.forEach(lang => {
  const filePath = path.join(__dirname, 'locales', `${lang}.json`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ Файл ${lang}.json не найден`);
    return;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);

    // Исправляем переменные времени
    const fixes = timeFixes[lang];
    if (fixes) {
      Object.keys(fixes).forEach(key => {
        if (data[key]) {
          data[key] = fixes[key];
        }
      });
    }

    // Сохраняем файл
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`✅ ${lang.toUpperCase()}: Исправлены переменные времени`);
    
  } catch (error) {
    console.log(`❌ ${lang.toUpperCase()}: Ошибка - ${error.message}`);
  }
});

console.log('===============================================');
console.log('🎉 Исправление завершено!');
