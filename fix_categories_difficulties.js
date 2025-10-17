const fs = require('fs');
const path = require('path');

const languages = ['pl', 'sv', 'cs', 'sk', 'fi', 'it', 'de', 'fr'];

const categoryTranslations = {
  pl: {
    'Endurance': 'Wytrzymałość',
    'Explosive Speed': 'Prędkość eksplozywna',
    'Warm-up': 'Rozgrzewka',
    'Stretching': 'Rozciąganie',
    'Agility': 'Zwinność',
    'Strength': 'Siła',
    'Balance': 'Równowaga',
    'Speed Endurance': 'Wytrzymałość szybkościowa',
    'Recovery': 'Regeneracja'
  },
  sv: {
    'Endurance': 'Uthållighet',
    'Explosive Speed': 'Explosiv hastighet',
    'Warm-up': 'Uppvärmning',
    'Stretching': 'Stretching',
    'Agility': 'Fingerfärdighet',
    'Strength': 'Styrka',
    'Balance': 'Balans',
    'Speed Endurance': 'Hastighet uthållighet',
    'Recovery': 'Återhämtning'
  },
  cs: {
    'Endurance': 'Výdrž',
    'Explosive Speed': 'Výbušná rychlost',
    'Warm-up': 'Zahřátí',
    'Stretching': 'Protahování',
    'Agility': 'Obratnost',
    'Strength': 'Síla',
    'Balance': 'Rovnováha',
    'Speed Endurance': 'Rychlostní výdrž',
    'Recovery': 'Zotavení'
  },
  sk: {
    'Endurance': 'Výdrž',
    'Explosive Speed': 'Výbušná rýchlosť',
    'Warm-up': 'Zahriatie',
    'Stretching': 'Strečing',
    'Agility': 'Obratnosť',
    'Strength': 'Sila',
    'Balance': 'Rovnováha',
    'Speed Endurance': 'Rýchlostná výdrž',
    'Recovery': 'Zotavenie'
  },
  fi: {
    'Endurance': 'Kestävyys',
    'Explosive Speed': 'Räjähdysmäinen nopeus',
    'Warm-up': 'Lämmittely',
    'Stretching': 'Venyttely',
    'Agility': 'Ketteryys',
    'Strength': 'Voima',
    'Balance': 'Tasapaino',
    'Speed Endurance': 'Nopeuskestävyys',
    'Recovery': 'Toipuminen'
  },
  it: {
    'Endurance': 'Resistenza',
    'Explosive Speed': 'Velocità esplosiva',
    'Warm-up': 'Riscaldamento',
    'Stretching': 'Stretching',
    'Agility': 'Agilità',
    'Strength': 'Forza',
    'Balance': 'Equilibrio',
    'Speed Endurance': 'Resistenza alla velocità',
    'Recovery': 'Recupero'
  },
  de: {
    'Endurance': 'Ausdauer',
    'Explosive Speed': 'Explosive Geschwindigkeit',
    'Warm-up': 'Aufwärmen',
    'Stretching': 'Dehnen',
    'Agility': 'Beweglichkeit',
    'Strength': 'Kraft',
    'Balance': 'Gleichgewicht',
    'Speed Endurance': 'Schnelligkeitsausdauer',
    'Recovery': 'Erholung'
  },
  fr: {
    'Endurance': 'Endurance',
    'Explosive Speed': 'Vitesse explosive',
    'Warm-up': 'Échauffement',
    'Stretching': 'Étirement',
    'Agility': 'Agilité',
    'Strength': 'Force',
    'Balance': 'Équilibre',
    'Speed Endurance': 'Endurance de vitesse',
    'Recovery': 'Récupération'
  }
};

const difficultyTranslations = {
  pl: {
    'Beginner': 'Początkujący',
    'Intermediate': 'Średni',
    'Advanced': 'Zaawansowany',
    'Easy': 'Łatwy'
  },
  sv: {
    'Beginner': 'Början',
    'Intermediate': 'Genomsnitt',
    'Advanced': 'Avancerad',
    'Easy': 'Lätt'
  },
  cs: {
    'Beginner': 'Začátečník',
    'Intermediate': 'Střední',
    'Advanced': 'Pokročilý',
    'Easy': 'Snadný'
  },
  sk: {
    'Beginner': 'Začiatočník',
    'Intermediate': 'Stredný',
    'Advanced': 'Pokročilý',
    'Easy': 'Ľahký'
  },
  fi: {
    'Beginner': 'Aloittelija',
    'Intermediate': 'Keskitaso',
    'Advanced': 'Edistynyt',
    'Easy': 'Helppo'
  },
  it: {
    'Beginner': 'Principiante',
    'Intermediate': 'Intermedio',
    'Advanced': 'Avanzato',
    'Easy': 'Facile'
  },
  de: {
    'Beginner': 'Anfänger',
    'Intermediate': 'Mittelstufe',
    'Advanced': 'Fortgeschritten',
    'Easy': 'Einfach'
  },
  fr: {
    'Beginner': 'Débutant',
    'Intermediate': 'Intermédiaire',
    'Advanced': 'Avancé',
    'Easy': 'Facile'
  }
};

console.log('🔧 ИСПРАВЛЕНИЕ КАТЕГОРИЙ И СЛОЖНОСТЕЙ УПРАЖНЕНИЙ');
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

    // Добавляем английские ключи для категорий
    if (data.exercises && data.exercises.categories) {
      const categories = categoryTranslations[lang];
      Object.keys(categories).forEach(key => {
        if (!data.exercises.categories[key]) {
          data.exercises.categories[key] = categories[key];
        }
      });
    }

    // Добавляем секцию difficulties
    if (data.exercises && !data.exercises.difficulties) {
      data.exercises.difficulties = {};
    }
    
    if (data.exercises && data.exercises.difficulties) {
      const difficulties = difficultyTranslations[lang];
      Object.keys(difficulties).forEach(key => {
        if (!data.exercises.difficulties[key]) {
          data.exercises.difficulties[key] = difficulties[key];
        }
      });
    }

    // Сохраняем файл
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`✅ ${lang.toUpperCase()}: Добавлены английские ключи для категорий и сложностей`);
    
  } catch (error) {
    console.log(`❌ ${lang.toUpperCase()}: Ошибка - ${error.message}`);
  }
});

console.log('===============================================');
console.log('🎉 Исправление завершено!');
