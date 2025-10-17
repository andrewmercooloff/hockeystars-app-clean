const fs = require('fs');
const path = require('path');

// Функция для проверки кириллических символов
function hasCyrillic(text) {
  if (!text || typeof text !== 'string') return false;
  return /[а-яё]/i.test(text);
}

// Функция для поиска непереведенных ключей
function findUntranslated(obj, prefix = '', untranslated = []) {
  if (typeof obj === 'string') {
    if (hasCyrillic(obj)) {
      untranslated.push({
        key: prefix,
        value: obj
      });
    }
  } else if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      findUntranslated(item, `${prefix}[${index}]`, untranslated);
    });
  } else if (typeof obj === 'object' && obj !== null) {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      findUntranslated(value, fullKey, untranslated);
    }
  }
  
  return untranslated;
}

try {
  console.log('🔍 ПОИСК НЕПЕРЕВЕДЕННЫХ ЭЛЕМЕНТОВ');
  console.log('==================================');
  
  // Загружаем литовский файл
  const ltPath = path.join(__dirname, 'locales', 'lt.json');
  const ltData = JSON.parse(fs.readFileSync(ltPath, 'utf8'));
  
  // Ищем непереведенные
  const untranslated = findUntranslated(ltData);
  
  if (untranslated.length === 0) {
    console.log('✅ Все элементы переведены!');
  } else {
    console.log(`❌ Найдено ${untranslated.length} непереведенных элементов\n`);
    
    // Группируем по доменам
    const byDomain = {};
    untranslated.forEach(item => {
      const domain = item.key.split('.')[0];
      if (!byDomain[domain]) byDomain[domain] = [];
      byDomain[domain].push(item);
    });
    
    console.log('📊 По доменам:');
    Object.entries(byDomain)
      .sort((a, b) => b[1].length - a[1].length)
      .forEach(([domain, items]) => {
        console.log(`\n${domain}: ${items.length} элементов`);
        items.slice(0, 5).forEach(item => {
          console.log(`  - ${item.key}: "${item.value.substring(0, 50)}${item.value.length > 50 ? '...' : ''}"`);
        });
        if (items.length > 5) {
          console.log(`  ... и еще ${items.length - 5}`);
        }
      });
    
    // Сохраняем полный список
    const outputPath = path.join(__dirname, 'untranslated_items.txt');
    const content = untranslated.map(item => `${item.key}: ${item.value}`).join('\n');
    fs.writeFileSync(outputPath, content, 'utf8');
    console.log(`\n📝 Полный список сохранен: untranslated_items.txt`);
  }
  
} catch (error) {
  console.error('❌ Ошибка:', error.message);
}
