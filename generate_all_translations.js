const fs = require('fs');

// Читаем файл exercise-details.tsx
const content = fs.readFileSync('./app/exercise-details.tsx', 'utf8');

// Извлекаем все упражнения
const exercises = {};
const exerciseRegex = /'(\d+)':\s*{([^}]+(?:{[^}]*}[^}]*)*)}/g;
let match;

while ((match = exerciseRegex.exec(content)) !== null) {
  const id = match[1];
  const exerciseContent = match[2];
  
  // Парсим каждое упражнение
  const title = extractValue(exerciseContent, 'title');
  const category = extractValue(exerciseContent, 'category');
  const duration = extractValue(exerciseContent, 'duration');
  const difficulty = extractValue(exerciseContent, 'difficulty');
  const description = extractValue(exerciseContent, 'description');
  const benefits = extractArray(exerciseContent, 'benefits');
  const instructions = extractArray(exerciseContent, 'instructions');
  const tips = extractArray(exerciseContent, 'tips');
  const equipment = extractValue(exerciseContent, 'equipment');
  const calories = extractValue(exerciseContent, 'calories');
  
  exercises[id] = {
    title,
    category,
    duration,
    difficulty,
    description,
    benefits,
    instructions,
    tips,
    equipment,
    calories
  };
}

function extractValue(content, key) {
  const regex = new RegExp(`${key}:\\s*'([^']+)'`);
  const match = content.match(regex);
  return match ? match[1] : '';
}

function extractArray(content, key) {
  const regex = new RegExp(`${key}:\\s*\\[([^\\]]+)\\]`, 's');
  const match = content.match(regex);
  if (!match) return [];
  
  const arrayContent = match[1];
  const items = [];
  const lines = arrayContent.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("'") && (trimmed.endsWith("',") || trimmed.endsWith("'"))) {
      const item = trimmed.slice(1, trimmed.endsWith("',") ? -2 : -1);
      items.push(item);
    }
  }
  
  return items;
}

// Генерируем русские переводы
function generateRussianTranslations() {
  let result = '';
  
  for (const [id, exercise] of Object.entries(exercises)) {
    result += `      "${id}": {\n`;
    result += `        "title": "${exercise.title}",\n`;
    result += `        "description": "${exercise.description}",\n`;
    
    if (exercise.benefits.length > 0) {
      result += `        "benefits": [\n`;
      exercise.benefits.forEach((benefit, index) => {
        result += `          "${benefit}"${index < exercise.benefits.length - 1 ? ',' : ''}\n`;
      });
      result += `        ],\n`;
    }
    
    if (exercise.instructions.length > 0) {
      result += `        "instructions": [\n`;
      exercise.instructions.forEach((instruction, index) => {
        result += `          "${instruction}"${index < exercise.instructions.length - 1 ? ',' : ''}\n`;
      });
      result += `        ],\n`;
    }
    
    if (exercise.tips.length > 0) {
      result += `        "tips": [\n`;
      exercise.tips.forEach((tip, index) => {
        result += `          "${tip}"${index < exercise.tips.length - 1 ? ',' : ''}\n`;
      });
      result += `        ],\n`;
    }
    
    if (exercise.equipment) {
      result += `        "equipment": "${exercise.equipment}",\n`;
    }
    
    if (exercise.calories) {
      result += `        "calories": "${exercise.calories}"\n`;
    }
    
    result += `      },\n`;
  }
  
  return result;
}

// Генерируем английские переводы
function generateEnglishTranslations() {
  const translations = {
    // Названия упражнений
    'Интервальный бег': 'Interval Running',
    'Берпи с прыжком': 'Burpee with Jump',
    'Велосипед': 'Cycling',
    'Плиометрические прыжки': 'Plyometric Jumps',
    'Спринты на короткие дистанции': 'Short Distance Sprints',
    'Броски мяча в стену': 'Ball Throws to Wall',
    'Динамическая растяжка ног': 'Dynamic Leg Stretching',
    'Разминка верхней части тела': 'Upper Body Warm-up',
    'Легкий бег на месте': 'Light Running in Place',
    'Статическая растяжка мышц ног': 'Static Leg Muscle Stretching',
    'Растяжка спины и плеч': 'Back and Shoulder Stretching',
    'Йога для хоккеистов': 'Yoga for Hockey Players',
    'Лестница координации': 'Coordination Ladder',
    'Жонглирование мячами': 'Ball Juggling',
    'Быстрые касания конусов': 'Quick Cone Touches',
    'Гребля на тренажере': 'Rowing Machine',
    'Скакалка с интервалами': 'Interval Jump Rope',
    'Бег по лестнице': 'Stair Running',
    'Планка с движениями': 'Plank with Movements',
    'Бег с высоким подниманием колен': 'High Knee Running',
    'Прыжки в длину с места': 'Standing Long Jump',
    'Быстрые отжимания': 'Fast Push-ups',
    'Прыжки через препятствия': 'Obstacle Jumps',
    'Быстрые приседания': 'Fast Squats',
    'Броски набивного мяча': 'Medicine Ball Throws',
    'Разминка голеностопа': 'Ankle Warm-up',
    'Разминка шеи': 'Neck Warm-up',
    'Разминка запястий': 'Wrist Warm-up',
    'Разминка коленей': 'Knee Warm-up',
    'Разминка тазобедренных суставов': 'Hip Joint Warm-up',
    'Растяжка паха': 'Groin Stretching',
    'Растяжка подколенных сухожилий': 'Hamstring Stretching',
    'Растяжка икроножных мышц': 'Calf Muscle Stretching',
    'Растяжка грудных мышц': 'Chest Muscle Stretching',
    'Растяжка трицепсов': 'Tricep Stretching',
    'Змейка между конусами': 'Snake Between Cones',
    'Быстрые касания ногами': 'Quick Foot Touches',
    'Прыжки с поворотами': 'Jumps with Turns',
    'Быстрые передачи мяча': 'Quick Ball Passes',
    'Бег спиной вперед': 'Backward Running',
    'Приседания с весом': 'Weighted Squats',
    'Становая тяга': 'Deadlift',
    'Жим лежа': 'Bench Press',
    'Подтягивания': 'Pull-ups',
    'Отжимания на брусьях': 'Dips',
    'Стойка на одной ноге': 'Single Leg Stand',
    'Планка на одной ноге': 'Single Leg Plank',
    'Приседания на одной ноге': 'Single Leg Squats',
    'Босу-мяч упражнения': 'BOSU Ball Exercises',
    'Йога-баланс': 'Yoga Balance',
    'Ходьба по бревну': 'Log Walking',
    'Стойка на руках у стены': 'Wall Handstand',
    'Фартлек': 'Fartlek',
    'Повторные спринты': 'Repeat Sprints',
    'Интервалы на велосипеде': 'Cycling Intervals',
    'Бег по холмам': 'Hill Running',
    'Плиометрические круги': 'Plyometric Circuits',
    'Легкая растяжка': 'Light Stretching',
    'Растяжка после тренировки': 'Post-Workout Stretching',
    'Массаж с роликом': 'Foam Roller Massage',
    'Контрастный душ': 'Contrast Shower',
    'Медитация и дыхание': 'Meditation and Breathing',
    'Легкая ходьба': 'Light Walking',
    'Растяжка с резинкой': 'Stretching with Resistance Band',
    'Восстановительное питание': 'Recovery Nutrition',
    
    // Оборудование
    'Коврик для упражнений (опционально)': 'Exercise mat (optional)',
    'Коврик для упражнений': 'Exercise mat',
    'Коврик для йоги': 'Yoga mat',
    'Беговая дорожка или стадион': 'Treadmill or stadium',
    'Велосипед или велотренажер': 'Bicycle or stationary bike',
    'Медицинский мяч 2-4 кг, стена': 'Medicine ball 2-4 kg, wall',
    'Стена или стул для опоры': 'Wall or chair for support',
    'Не требуется': 'Not required',
    'Лестница координации': 'Coordination ladder',
    '2-3 теннисных мяча': '2-3 tennis balls',
    '5-6 конусов или маркеров': '5-6 cones or markers',
    'Гребной тренажер': 'Rowing machine',
    'Скакалка': 'Jump rope',
    'Лестница': 'Stairs',
    'Открытое пространство или беговая дорожка': 'Open space or treadmill',
    'Набивной мяч 5-8 кг': 'Medicine ball 5-8 kg',
    'Открытое пространство': 'Open space',
    'Гантели или штанга': 'Dumbbells or barbell',
    'Штанга с блинами': 'Barbell with plates',
    'Штанга, скамья для жима': 'Barbell, bench press',
    'Перекладина': 'Pull-up bar',
    'Параллельные брусья': 'Parallel bars',
    'Босу-мяч': 'BOSU ball',
    'Бревно или доска шириной 15-20 см': 'Log or board 15-20 cm wide',
    'Стена, коврик для упражнений': 'Wall, exercise mat',
    'Холм с уклоном 10-15%': 'Hill with 10-15% slope',
    'Резиновая лента': 'Resistance band',
    'Здоровые продукты': 'Healthy foods',
    'Тихое место': 'Quiet place',
    'Удобная обувь': 'Comfortable shoes',
    'Душ': 'Shower'
  };
  
  let result = '';
  
  for (const [id, exercise] of Object.entries(exercises)) {
    result += `      "${id}": {\n`;
    result += `        "title": "${translations[exercise.title] || exercise.title}",\n`;
    result += `        "description": "${exercise.description}",\n`;
    
    if (exercise.benefits.length > 0) {
      result += `        "benefits": [\n`;
      exercise.benefits.forEach((benefit, index) => {
        result += `          "${benefit}"${index < exercise.benefits.length - 1 ? ',' : ''}\n`;
      });
      result += `        ],\n`;
    }
    
    if (exercise.instructions.length > 0) {
      result += `        "instructions": [\n`;
      exercise.instructions.forEach((instruction, index) => {
        result += `          "${instruction}"${index < exercise.instructions.length - 1 ? ',' : ''}\n`;
      });
      result += `        ],\n`;
    }
    
    if (exercise.tips.length > 0) {
      result += `        "tips": [\n`;
      exercise.tips.forEach((tip, index) => {
        result += `          "${tip}"${index < exercise.tips.length - 1 ? ',' : ''}\n`;
      });
      result += `        ],\n`;
    }
    
    if (exercise.equipment) {
      result += `        "equipment": "${translations[exercise.equipment] || exercise.equipment}",\n`;
    }
    
    if (exercise.calories) {
      result += `        "calories": "${exercise.calories}"\n`;
    }
    
    result += `      },\n`;
  }
  
  return result;
}

// Выводим результаты
console.log('=== СТАТИСТИКА ===');
console.log(`Всего упражнений: ${Object.keys(exercises).length}`);
console.log(`ID упражнений: ${Object.keys(exercises).join(', ')}`);

console.log('\n=== РУССКИЕ ПЕРЕВОДЫ ===');
console.log(generateRussianTranslations());

console.log('\n=== АНГЛИЙСКИЕ ПЕРЕВОДЫ ===');
console.log(generateEnglishTranslations());






