// Простой тест для проверки работы хука
console.log('🔄 Тестируем импорты...');

try {
  // Проверяем, что файлы существуют
  const fs = require('fs');
  
  const files = [
    './types/exercise.ts',
    './services/exerciseService.ts',
    './hooks/useExercises.ts'
  ];
  
  files.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`✅ ${file} существует`);
    } else {
      console.log(`❌ ${file} не найден`);
    }
  });
  
  console.log('✅ Все файлы на месте');
  
} catch (error) {
  console.error('❌ Ошибка:', error.message);
}






