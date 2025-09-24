// Отладка приложения
console.log('🔄 Отладка приложения...');

try {
  // Проверяем, что мы в правильной директории
  const fs = require('fs');
  const path = require('path');
  
  console.log('📁 Текущая директория:', process.cwd());
  
  // Проверяем package.json
  if (fs.existsSync('./package.json')) {
    console.log('✅ package.json найден');
    const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
    console.log('📦 Название проекта:', packageJson.name);
  } else {
    console.log('❌ package.json не найден');
  }
  
  // Проверяем app.json
  if (fs.existsSync('./app.json')) {
    console.log('✅ app.json найден');
  } else {
    console.log('❌ app.json не найден');
  }
  
  // Проверяем структуру проекта
  const dirs = ['app', 'types', 'services', 'hooks', 'utils'];
  dirs.forEach(dir => {
    if (fs.existsSync(`./${dir}`)) {
      console.log(`✅ ${dir}/ существует`);
    } else {
      console.log(`❌ ${dir}/ не найден`);
    }
  });
  
} catch (error) {
  console.error('❌ Ошибка:', error.message);
}