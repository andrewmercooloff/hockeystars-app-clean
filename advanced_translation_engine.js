const fs = require('fs');
const path = require('path');

// Расширенный словарь доменных переводов
const domainTranslations = {
  // Хоккейная терминология
  hockey: {
    positions: {
      "Центральный нападающий": "Centrinis puolėjas",
      "Крайний нападающий": "Kraštinis puolėjas", 
      "Защитник": "Gynėjas",
      "Вратарь": "Vartininkas"
    },
    skills: {
      "Выносливость": "Ištvermė",
      "Скоростная выносливость": "Greičio ištvermė",
      "Взрывная скорость": "Sprogstamasis greitis",
      "Координация": "Koordinacija",
      "Баланс": "Pusiausvyra",
      "Техника": "Technika"
    },
    training: {
      "Разминка": "Apšilimas",
      "Силовые упражнения": "Jėgos pratimai",
      "Интервальный бег": "Intervalinis bėgimas",
      "Бег на выносливость": "Ištvermės bėgimas"
    },
    difficulties: {
      "Начинающий": "Pradedantysis",
      "Средний": "Vidutinis",
      "Продвинутый": "Pažengęs",
      "Эксперт": "Ekspertas"
    }
  },
  
  // Статусы и роли
  roles: {
    "Игрок": "Žaidėjas",
    "Тренер": "Treneris", 
    "Скаут": "Skautas",
    "Звезда": "Žvaigždė",
    "Администратор": "Administratorius"
  },
  
  // UI и общие элементы
  ui: {
    actions: {
      "Сохранить": "Išsaugoti",
      "Отменить": "Atšaukti",
      "Выбрать": "Pasirinkti",
      "Продолжить": "Tęsti",
      "Завершить": "Baigti"
    },
    statuses: {
      "активный": "aktyvus",
      "неактивный": "neaktyvus",
      "онлайн": "prisijungęs",
      "офлайн": "atsijungęs"
    },
    media: {
      "фотографию": "nuotrauką",
      "фотография": "nuotrauka",
      "фото": "nuotrauka",
      "Выберите источник": "Pasirinkite šaltinį",
      "Галерея": "Galerija",
      "Камера": "Kamera"
    }
  },
  
  // Уведомления
  notifications: {
    friendship: {
      "Новая дружба": "Nauja draugystė",
      "стали друзьями": "tapo draugais"
    },
    exercise: {
      "выполнено": "atlikta"
    },
    gift: {
      "звезды": "žvaigždės",
      "получил": "gavo",
      "подарок": "dovaną"
    }
  }
};

// Продвинутая функция перевода с контекстным анализом
function advancedTranslate(text, context = {}) {
  if (!text || typeof text !== 'string') return text;
  
  // Проверяем, что текст содержит только кириллицу
  const hasCyrillic = /[а-яё]/i.test(text);
  const hasLatin = /[a-z]/i.test(text);
  
  // Если есть и кириллица, и латиница - не трогаем
  if (hasCyrillic && hasLatin) {
    return text;
  }
  
  // Если только кириллица - переводим
  if (hasCyrillic && !hasLatin) {
    // Приоритетные словари с учетом контекста
    const contextDictionaries = [
      context.domain === 'hockey' && domainTranslations.hockey[context.subDomain],
      context.domain === 'roles' && domainTranslations.roles,
      context.domain === 'ui' && domainTranslations.ui[context.subDomain],
      context.domain === 'notifications' && domainTranslations.notifications[context.subDomain]
    ].filter(Boolean);
    
    // Точные замены из словарей
    for (const dict of contextDictionaries) {
      if (dict[text]) {
        return dict[text];
      }
    }
    
    // Общие замены из всех словарей
    let result = text;
    for (const domain of Object.values(domainTranslations)) {
      for (const subDict of Object.values(domain)) {
        if (subDict[result]) {
          result = subDict[result];
          break;
        }
      }
    }
    
    // Специальные преобразования
    result = result
      .replace(/(\d+)\s*секунд/gi, '$1 sekundžių')
      .replace(/(\d+)\s*минут/gi, '$1 minučių')
      .replace(/(\d+)\s*раз/gi, '$1 kartų')
      .replace(/ккал/gi, 'kcal');
    
    return result;
  }
  
  return text;
}

// Рекурсивная функция для обработки объекта
function translateObject(obj, context = {}) {
  if (typeof obj === 'string') {
    return advancedTranslate(obj, context);
  } else if (Array.isArray(obj)) {
    return obj.map(item => translateObject(item, context));
  } else if (typeof obj === 'object' && obj !== null) {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      // Передаем дополнительный контекст
      const newContext = { ...context };
      
      // Определяем контекст по ключам
      if (key === 'position') newContext.domain = 'hockey', newContext.subDomain = 'positions';
      if (key === 'skills') newContext.domain = 'hockey', newContext.subDomain = 'skills';
      if (key === 'difficulty') newContext.domain = 'hockey', newContext.subDomain = 'difficulties';
      if (key.includes('Notification')) newContext.domain = 'notifications';
      if (key === 'status') newContext.domain = 'roles';
      if (key.includes('Photo') || key.includes('Camera')) newContext.domain = 'ui', newContext.subDomain = 'media';
      
      result[key] = translateObject(value, newContext);
    }
    return result;
  }
  return obj;
}

try {
  console.log('🌍 ПРОДВИНУТЫЙ ПЕРЕВОД НА ЛИТОВСКИЙ...');
  console.log('=====================================');
  
  // Загружаем литовский файл
  const ltPath = path.join(__dirname, 'locales', 'lt.json');
  const ltData = JSON.parse(fs.readFileSync(ltPath, 'utf8'));
  
  console.log('📋 Применяем контекстный перевод...');
  
  // Переводим с учетом контекста
  const translatedData = translateObject(ltData);
  
  // Сохраняем результат
  fs.writeFileSync(ltPath, JSON.stringify(translatedData, null, 2), 'utf8');
  
  console.log('✅ Перевод завершен!');
  console.log(`📄 Обновлен файл: locales/lt.json`);
  
  // Подсчет примененных переводов
  const translationCount = 
    Object.keys(domainTranslations.hockey.positions).length +
    Object.keys(domainTranslations.hockey.skills).length +
    Object.keys(domainTranslations.hockey.training).length +
    Object.keys(domainTranslations.hockey.difficulties).length +
    Object.keys(domainTranslations.roles).length +
    Object.keys(domainTranslations.ui.actions).length +
    Object.keys(domainTranslations.ui.statuses).length +
    Object.keys(domainTranslations.ui.media).length +
    Object.keys(domainTranslations.notifications.friendship).length +
    Object.keys(domainTranslations.notifications.exercise).length +
    Object.keys(domainTranslations.notifications.gift).length;
  
  console.log(`🎯 Применено ${translationCount} контекстных переводов`);
  console.log('');
  console.log('🔍 Запустите проверку для оценки результата');
  
} catch (error) {
  console.error('❌ Ошибка перевода:', error.message);
}
