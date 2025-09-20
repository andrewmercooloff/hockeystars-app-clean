const { createClient } = require('@supabase/supabase-js');

// Конфигурация Supabase
const supabaseUrl = 'https://jvsypfwiajuwsyuzkyda.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2c3lwZndpYWp1d3N5dXpreWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5OTczNTcsImV4cCI6MjA2OTU3MzM1N30.8d8k7HK7lFgIirdHzackMYRn6gGgD5OyqgOUq2rk2RM';

const supabase = createClient(supabaseUrl, supabaseKey);

// Данные для заполнения всех упражнений (продолжение)
const exerciseDetails = {
  '16': {
    benefits_ru: ['Развивает выносливость', 'Укрепляет мышцы спины и рук', 'Улучшает сердечно-сосудистую систему', 'Сжигает калории'],
    benefits_en: ['Develops endurance', 'Strengthens back and arm muscles', 'Improves cardiovascular system', 'Burns calories'],
    instructions_ru: [
      'Сядьте на тренажер для гребли',
      'Зафиксируйте ноги на подставках',
      'Возьмите рукоятку широким хватом',
      'Начните движение, отталкиваясь ногами',
      'Подтяните рукоятку к груди',
      'Вернитесь в исходное положение',
      'Выполните 3-4 подхода по 5-10 минут'
    ],
    instructions_en: [
      'Sit on the rowing machine',
      'Secure your feet on the footrests',
      'Grab the handle with a wide grip',
      'Start the movement by pushing with your legs',
      'Pull the handle to your chest',
      'Return to starting position',
      'Perform 3-4 sets of 5-10 minutes'
    ],
    tips_ru: [
      'Следите за правильной техникой',
      'Не округляйте спину',
      'Дышите ритмично',
      'Начинайте с легкого веса'
    ],
    tips_en: [
      'Watch for proper technique',
      'Don\'t round your back',
      'Breathe rhythmically',
      'Start with light weight'
    ]
  },
  '19': {
    benefits_ru: ['Укрепляет мышцы кора', 'Развивает стабильность', 'Улучшает баланс', 'Повышает выносливость'],
    benefits_en: ['Strengthens core muscles', 'Develops stability', 'Improves balance', 'Increases endurance'],
    instructions_ru: [
      'Примите положение планки на предплечьях',
      'Поднимите правую руку и коснитесь левого плеча',
      'Верните руку в исходное положение',
      'Повторите левой рукой',
      'Добавьте подъемы ног',
      'Выполните 3-4 подхода по 30-60 секунд'
    ],
    instructions_en: [
      'Assume forearm plank position',
      'Lift your right hand and touch your left shoulder',
      'Return your hand to starting position',
      'Repeat with your left hand',
      'Add leg lifts',
      'Perform 3-4 sets of 30-60 seconds'
    ],
    tips_ru: [
      'Держите тело прямым',
      'Не раскачивайтесь из стороны в сторону',
      'Дышите ровно',
      'Начинайте с простых движений'
    ],
    tips_en: [
      'Keep your body straight',
      'Don\'t sway from side to side',
      'Breathe evenly',
      'Start with simple movements'
    ]
  },
  '20': {
    benefits_ru: ['Развивает взрывную силу ног', 'Улучшает координацию', 'Повышает скорость бега', 'Укрепляет мышцы бедер'],
    benefits_en: ['Develops explosive leg power', 'Improves coordination', 'Increases running speed', 'Strengthens thigh muscles'],
    instructions_ru: [
      'Встаньте прямо, ноги на ширине плеч',
      'Начните бег на месте',
      'Поднимайте колени как можно выше',
      'Работайте руками активно',
      'Увеличивайте скорость постепенно',
      'Выполните 3-4 подхода по 30-60 секунд'
    ],
    instructions_en: [
      'Stand straight, feet shoulder-width apart',
      'Start running in place',
      'Lift your knees as high as possible',
      'Work your arms actively',
      'Gradually increase speed',
      'Perform 3-4 sets of 30-60 seconds'
    ],
    tips_ru: [
      'Приземляйтесь на носки',
      'Держите спину прямой',
      'Работайте руками энергично',
      'Не торопитесь в начале'
    ],
    tips_en: [
      'Land on your toes',
      'Keep your back straight',
      'Work your arms energetically',
      'Don\'t rush at the beginning'
    ]
  },
  '21': {
    benefits_ru: ['Развивает взрывную силу', 'Укрепляет мышцы ног', 'Улучшает координацию', 'Повышает прыгучесть'],
    benefits_en: ['Develops explosive power', 'Strengthens leg muscles', 'Improves coordination', 'Increases jumping ability'],
    instructions_ru: [
      'Встаньте прямо, ноги на ширине плеч',
      'Согните ноги в коленях',
      'Оттолкнитесь обеими ногами одновременно',
      'Прыгните как можно дальше вперед',
      'Приземлитесь на обе ноги',
      'Выполните 3-4 подхода по 5-10 прыжков'
    ],
    instructions_en: [
      'Stand straight, feet shoulder-width apart',
      'Bend your knees',
      'Push off with both feet simultaneously',
      'Jump as far forward as possible',
      'Land on both feet',
      'Perform 3-4 sets of 5-10 jumps'
    ],
    tips_ru: [
      'Приземляйтесь мягко',
      'Сгибайте ноги при приземлении',
      'Работайте руками для баланса',
      'Не торопитесь между прыжками'
    ],
    tips_en: [
      'Land softly',
      'Bend your knees when landing',
      'Use your arms for balance',
      'Don\'t rush between jumps'
    ]
  },
  '26': {
    benefits_ru: ['Разогревает голеностопные суставы', 'Предотвращает травмы', 'Улучшает подвижность', 'Подготавливает к нагрузкам'],
    benefits_en: ['Warms up ankle joints', 'Prevents injuries', 'Improves mobility', 'Prepares for loads'],
    instructions_ru: [
      'Сядьте на пол, вытянув ноги',
      'Вращайте стопами по часовой стрелке',
      'Затем против часовой стрелки',
      'Сгибайте и разгибайте стопы',
      'Выполните круговые движения пальцами',
      'Повторите для каждой ноги по 2-3 минуты'
    ],
    instructions_en: [
      'Sit on the floor with legs extended',
      'Rotate your feet clockwise',
      'Then counterclockwise',
      'Flex and extend your feet',
      'Perform circular movements with your toes',
      'Repeat for each leg for 2-3 minutes'
    ],
    tips_ru: [
      'Двигайтесь медленно и плавно',
      'Не делайте резких движений',
      'Дышите ровно',
      'Сосредоточьтесь на ощущениях'
    ],
    tips_en: [
      'Move slowly and smoothly',
      'Don\'t make sudden movements',
      'Breathe evenly',
      'Focus on sensations'
    ]
  }
};

async function fillExerciseDetails() {
  try {
    console.log('🔄 Заполняем недостающие детали упражнений (часть 2)...\n');

    let updatedCount = 0;
    let errorCount = 0;

    for (const [exerciseId, details] of Object.entries(exerciseDetails)) {
      console.log(`📝 Обновляем упражнение ${exerciseId}...`);
      
      try {
        const { error } = await supabase
          .from('exercises')
          .update(details)
          .eq('exercise_id', exerciseId);

        if (error) {
          console.error(`❌ Ошибка обновления упражнения ${exerciseId}:`, error.message);
          errorCount++;
        } else {
          console.log(`✅ Упражнение ${exerciseId} обновлено успешно`);
          updatedCount++;
        }
      } catch (err) {
        console.error(`❌ Исключение при обновлении упражнения ${exerciseId}:`, err.message);
        errorCount++;
      }
    }

    console.log(`\n🎉 Заполнение завершено!`);
    console.log(`✅ Успешно обновлено: ${updatedCount} упражнений`);
    console.log(`❌ Ошибок: ${errorCount} упражнений`);

  } catch (error) {
    console.error('❌ Общая ошибка:', error);
  }
}

fillExerciseDetails();


