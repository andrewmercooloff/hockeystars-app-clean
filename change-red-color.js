const fs = require('fs');
const path = require('path');

// Новый цвет
const newColor = '#fa2f40';
const newColorRgb = 'rgb(250, 47, 64)';
const newColorRgba = 'rgba(250, 47, 64,';

// Цвета для замены
const colorsToReplace = [
  '#fa2f40', 'rgb(250, 47, 64)', 'rgba(250, 47, 64,',
  '#fa2f40', 'rgb(250, 47, 64)', 'rgba(250, 47, 64,',
  '#fa2f40', 'rgb(250, 47, 64)', 'rgba(250, 47, 64,',
  '#fa2f40', 'rgb(250, 47, 64)', 'rgba(250, 47, 64,',
  '#fa2f40', 'rgb(250, 47, 64)', 'rgba(250, 47, 64,',
  '#fa2f40', 'rgb(250, 47, 64)', 'rgba(250, 47, 64,',
  '#fa2f40', 'rgb(250, 47, 64)', 'rgba(250, 47, 64,',
  '#fa2f40', 'rgb(250, 47, 64)', 'rgba(250, 47, 64,',
  '#fa2f40', 'rgb(250, 47, 64)', 'rgba(250, 47, 64,',
  '#fa2f40', 'rgb(250, 47, 64)', 'rgba(250, 47, 64,',
  '#fa2f40', 'rgb(250, 47, 64)', 'rgba(250, 47, 64,',
  '#fa2f40', 'rgb(250, 47, 64)', 'rgba(250, 47, 64,',
  '#fa2f40', 'rgb(250, 47, 64)', 'rgba(250, 47, 64,',
  '#fa2f40', 'rgb(250, 47, 64)', 'rgba(250, 47, 64,',
  '#fa2f40', 'rgb(250, 47, 64)', 'rgba(250, 47, 64,',
  '#fa2f40', 'rgb(250, 47, 64)', 'rgba(250, 47, 64,',
  '#fa2f40', 'rgb(250, 47, 64)', 'rgba(250, 47, 64,',
  '#fa2f40', 'rgb(250, 47, 64)', 'rgba(250, 47, 64,',
  '#fa2f40', 'rgb(250, 47, 64)', 'rgba(250, 47, 64,',
  '#fa2f40', 'rgb(250, 47, 64)', 'rgba(250, 47, 64,',
  '#fa2f40', 'rgb(250, 47, 64)', 'rgba(250, 47, 64,',
  '#fa2f40', 'rgb(250, 47, 64)', 'rgba(250, 47, 64,',
  '#fa2f40', 'rgb(250, 47, 64)', 'rgba(250, 47, 64,'
];

// Функция для рекурсивного поиска файлов
function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      // Пропускаем node_modules и другие служебные папки
      if (!['node_modules', '.git', '.expo', 'dist', 'build'].includes(file)) {
        arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
      }
    } else {
      // Обрабатываем только файлы с нужными расширениями
      if (file.match(/\.(tsx?|jsx?|json|css|scss|sass|less)$/)) {
        arrayOfFiles.push(fullPath);
      }
    }
  });

  return arrayOfFiles;
}

// Функция для замены цветов в файле
function replaceColorsInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let hasChanges = false;
    let changeCount = 0;

    // Заменяем каждый цвет
    colorsToReplace.forEach(color => {
      const regex = new RegExp(color.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      const matches = content.match(regex);
      if (matches) {
        changeCount += matches.length;
        hasChanges = true;
        
        // Определяем формат замены
        if (color.startsWith('rgb(')) {
          content = content.replace(regex, newColorRgb);
        } else if (color.startsWith('rgba(')) {
          content = content.replace(regex, newColorRgba);
        } else {
          content = content.replace(regex, newColor);
        }
      }
    });

    if (hasChanges) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ ${filePath} - заменено ${changeCount} вхождений`);
      return { changed: true, count: changeCount };
    }

    return { changed: false, count: 0 };
  } catch (error) {
    console.error(`❌ Ошибка обработки файла ${filePath}:`, error.message);
    return { changed: false, count: 0, error: error.message };
  }
}

// Основная функция
function main() {
  console.log('🎨 Начинаем замену красных цветов на #fa2f40...\n');
  
  const projectDir = __dirname;
  const files = getAllFiles(projectDir);
  
  console.log(`📁 Найдено ${files.length} файлов для обработки\n`);
  
  let totalFilesChanged = 0;
  let totalChanges = 0;
  const errors = [];

  files.forEach(file => {
    const result = replaceColorsInFile(file);
    if (result.changed) {
      totalFilesChanged++;
      totalChanges += result.count;
    }
    if (result.error) {
      errors.push({ file, error: result.error });
    }
  });

  console.log('\n📊 Результаты замены:');
  console.log(`✅ Файлов изменено: ${totalFilesChanged}`);
  console.log(`🎨 Всего замен: ${totalChanges}`);
  
  if (errors.length > 0) {
    console.log(`❌ Ошибок: ${errors.length}`);
    errors.forEach(err => {
      console.log(`   - ${err.file}: ${err.error}`);
    });
  }

  console.log('\n🎉 Замена цветов завершена!');
}

main();
