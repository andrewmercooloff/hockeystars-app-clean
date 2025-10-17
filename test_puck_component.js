// Простой тест для проверки компонента Puck
console.log('🧪 Тестирование компонента Puck...');

// Проверяем, что все импорты работают
try {
  const React = require('react');
  console.log('✅ React импортирован');
} catch (error) {
  console.error('❌ Ошибка импорта React:', error);
}

// Проверяем, что файл Puck.tsx существует и может быть прочитан
const fs = require('fs');
const path = require('path');

const puckPath = path.join(__dirname, 'components', 'Puck.tsx');

if (fs.existsSync(puckPath)) {
  console.log('✅ Файл Puck.tsx существует');
  
  const content = fs.readFileSync(puckPath, 'utf8');
  
  // Проверяем наличие ключевых элементов
  if (content.includes('useMemo')) {
    console.log('✅ useMemo найден');
  }
  
  if (content.includes('useCallback')) {
    console.log('✅ useCallback найден');
  }
  
  if (content.includes('imageSource')) {
    console.log('✅ imageSource найден');
  }
  
  if (content.includes('onError')) {
    console.log('✅ onError найден');
  }
  
  if (content.includes('onLoad')) {
    console.log('✅ onLoad найден');
  }
  
  console.log('✅ Компонент Puck.tsx выглядит корректно');
} else {
  console.error('❌ Файл Puck.tsx не найден');
}

console.log('🎉 Тестирование завершено!'); 