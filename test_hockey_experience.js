// Тест функции calculateHockeyExperience
function calculateHockeyExperience(startDate) {
  if (!startDate) return '';
  try {
    const [month, year] = startDate.split('.');
    const start = new Date(parseInt(year), parseInt(month) - 1);
    const now = new Date();
    let years = now.getFullYear() - start.getFullYear();
    let months = now.getMonth() - start.getMonth();
    if (months < 0) {
      years--;
      months += 12;
    }
    
    // Правильное склонение для русского языка
    const getYearWord = (num) => {
      if (num === 1) return 'год';
      if (num >= 2 && num <= 4) return 'года';
      return 'лет';
    };
    
    return years > 0 ? `${years} ${getYearWord(years)}` : `${months} мес.`;
  } catch (error) {
    console.error('❌ Ошибка расчета опыта хоккея:', error);
    return '';
  }
}

// Тестируем функцию
console.log('🧪 Тестирование функции calculateHockeyExperience:\n');

const testCases = [
  '01.2022', // 2 года
  '06.2020', // 3+ года
  '12.2023', // меньше года
  '03.2021', // 2+ года
  'invalid', // неверный формат
  '',        // пустая строка
  null,      // null
  undefined  // undefined
];

testCases.forEach(testCase => {
  const result = calculateHockeyExperience(testCase);
  console.log(`Дата: "${testCase}" -> Результат: "${result}"`);
});

console.log('\n✅ Тест завершен'); 