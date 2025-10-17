const fs = require('fs');

// Читаем CSV файл
const csv = fs.readFileSync('scripts/exercises-for-google-sheets.csv', 'utf8');
const lines = csv.split('\n');

console.log('Упражнения с пустыми инструкциями и советами:');
console.log('===============================================');

let count = 0;
lines.forEach((line, index) => {
  // Пропускаем заголовок
  if (index === 0) return;
  
  const parts = line.split(',');
  if (parts.length >= 4) {
    const exerciseId = parts[0];
    const title = parts[1].replace(/"/g, '');
    const instructionsCount = parseInt(parts[2]);
    const tipsCount = parseInt(parts[3]);
    
    // Проверяем, есть ли пустые инструкции и советы
    if (instructionsCount === 0 && tipsCount === 0) {
      count++;
      console.log(`${count}. #${exerciseId}: ${title}`);
    }
  }
});

console.log(`\nВсего упражнений с пустыми инструкциями: ${count}`);








