const fs = require('fs');

// Читаем файл exercise-details.tsx
const exerciseDetailsContent = fs.readFileSync('./app/exercise-details.tsx', 'utf8');

// Извлекаем данные упражнений с помощью регулярного выражения
const exerciseRegex = /'(\d+)':\s*{([^}]+(?:{[^}]*}[^}]*)*)}/g;
const exercises = {};

let match;
while ((match = exerciseRegex.exec(exerciseDetailsContent)) !== null) {
  const id = match[1];
  const content = match[2];
  
  // Парсим содержимое упражнения
  const titleMatch = content.match(/title:\s*'([^']+)'/);
  const categoryMatch = content.match(/category:\s*'([^']+)'/);
  const durationMatch = content.match(/duration:\s*'([^']+)'/);
  const difficultyMatch = content.match(/difficulty:\s*'([^']+)'/);
  const descriptionMatch = content.match(/description:\s*'([^']+)'/);
  
  // Извлекаем массивы
  const benefitsMatch = content.match(/benefits:\s*\[([^\]]+)\]/s);
  const instructionsMatch = content.match(/instructions:\s*\[([^\]]+)\]/s);
  const tipsMatch = content.match(/tips:\s*\[([^\]]+)\]/s);
  
  const equipmentMatch = content.match(/equipment:\s*'([^']+)'/);
  const caloriesMatch = content.match(/calories:\s*'([^']+)'/);
  
  if (titleMatch) {
    exercises[id] = {
      title: titleMatch[1],
      category: categoryMatch ? categoryMatch[1] : '',
      duration: durationMatch ? durationMatch[1] : '',
      difficulty: difficultyMatch ? difficultyMatch[1] : '',
      description: descriptionMatch ? descriptionMatch[1] : '',
      benefits: benefitsMatch ? parseArray(benefitsMatch[1]) : [],
      instructions: instructionsMatch ? parseArray(instructionsMatch[1]) : [],
      tips: tipsMatch ? parseArray(tipsMatch[1]) : [],
      equipment: equipmentMatch ? equipmentMatch[1] : '',
      calories: caloriesMatch ? caloriesMatch[1] : ''
    };
  }
}

// Функция для парсинга массивов
function parseArray(arrayString) {
  const items = [];
  const lines = arrayString.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("'") && trimmed.endsWith("',")) {
      items.push(trimmed.slice(1, -2));
    } else if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
      items.push(trimmed.slice(1, -1));
    }
  }
  
  return items;
}

// Выводим результаты
console.log('=== СТАТИСТИКА ===');
console.log(`Всего упражнений: ${Object.keys(exercises).length}`);
console.log(`ID упражнений: ${Object.keys(exercises).join(', ')}`);

// Выводим первые несколько упражнений для проверки
console.log('\n=== ПЕРВЫЕ 3 УПРАЖНЕНИЯ ===');
for (let i = 1; i <= 3; i++) {
  if (exercises[i.toString()]) {
    console.log(`\nУпражнение ${i}:`);
    console.log(`  Название: ${exercises[i.toString()].title}`);
    console.log(`  Категория: ${exercises[i.toString()].category}`);
    console.log(`  Польза: ${exercises[i.toString()].benefits.length} пунктов`);
    console.log(`  Инструкции: ${exercises[i.toString()].instructions.length} пунктов`);
    console.log(`  Советы: ${exercises[i.toString()].tips.length} пунктов`);
  }
}