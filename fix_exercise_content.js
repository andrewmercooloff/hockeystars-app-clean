const fs = require('fs');
const path = require('path');

const languages = ['pl', 'sv', 'cs', 'sk', 'fi', 'it', 'de', 'fr'];

console.log('🔧 ИСПРАВЛЕНИЕ СОДЕРЖИМОГО УПРАЖНЕНИЙ');
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

    if (data.exercises && data.exercises.items) {
      let fixedCount = 0;
      
      // Проходим по всем упражнениям
      Object.keys(data.exercises.items).forEach(exerciseId => {
        const exercise = data.exercises.items[exerciseId];
        
        // Исправляем benefits
        if (exercise['benefits[0]']) {
          const benefits = [];
          let i = 0;
          while (exercise[`benefits[${i}]`]) {
            benefits.push(exercise[`benefits[${i}]`]);
            delete exercise[`benefits[${i}]`];
            i++;
          }
          exercise.benefits = benefits;
          fixedCount++;
        }
        
        // Исправляем instructions
        if (exercise['instructions[0]']) {
          const instructions = [];
          let i = 0;
          while (exercise[`instructions[${i}]`]) {
            instructions.push(exercise[`instructions[${i}]`]);
            delete exercise[`instructions[${i}]`];
            i++;
          }
          exercise.instructions = instructions;
          fixedCount++;
        }
        
        // Исправляем tips
        if (exercise['tips[0]']) {
          const tips = [];
          let i = 0;
          while (exercise[`tips[${i}]`]) {
            tips.push(exercise[`tips[${i}]`]);
            delete exercise[`tips[${i}]`];
            i++;
          }
          exercise.tips = tips;
          fixedCount++;
        }
      });

      // Сохраняем файл
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      console.log(`✅ ${lang.toUpperCase()}: Исправлено ${fixedCount} упражнений`);
      
    } else {
      console.log(`⚠️  ${lang.toUpperCase()}: Секция exercises.items не найдена`);
    }
    
  } catch (error) {
    console.log(`❌ ${lang.toUpperCase()}: Ошибка - ${error.message}`);
  }
});

console.log('===============================================');
console.log('🎉 Исправление завершено!');
