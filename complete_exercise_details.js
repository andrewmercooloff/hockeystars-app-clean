const { createClient } = require('@supabase/supabase-js');

// Конфигурация Supabase
const supabaseUrl = 'https://jvsypfwiajuwsyuzkyda.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2c3lwZndpYWp1d3N5dXpreWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5OTczNTcsImV4cCI6MjA2OTU3MzM1N30.8d8k7HK7lFgIirdHzackMYRn6gGgD5OyqgOUq2rk2RM';

const supabase = createClient(supabaseUrl, supabaseKey);

// Полные данные для всех упражнений
const exerciseDetails = {
  '11': {
    benefits_ru: ['Улучшает гибкость позвоночника', 'Снимает напряжение в плечах', 'Предотвращает травмы спины', 'Улучшает осанку'],
    benefits_en: ['Improves spine flexibility', 'Relieves shoulder tension', 'Prevents back injuries', 'Improves posture'],
    instructions_ru: [
      'Встаньте прямо, ноги на ширине плеч',
      'Поднимите правую руку вверх и наклонитесь влево',
      'Задержитесь на 15-20 секунд',
      'Повторите для левой стороны',
      'Выполните 3-5 повторений для каждой стороны'
    ],
    instructions_en: [
      'Stand straight, feet shoulder-width apart',
      'Raise your right arm up and lean to the left',
      'Hold for 15-20 seconds',
      'Repeat for the left side',
      'Perform 3-5 repetitions for each side'
    ],
    tips_ru: [
      'Дышите глубоко во время растяжки',
      'Не делайте резких движений',
      'Чувствуйте растяжение, но не боль',
      'Выполняйте ежедневно для лучшего результата'
    ],
    tips_en: [
      'Breathe deeply during stretching',
      'Avoid sudden movements',
      'Feel the stretch but not pain',
      'Perform daily for better results'
    ]
  },
  '12': {
    benefits_ru: ['Улучшает баланс и координацию', 'Снимает стресс', 'Укрепляет мышцы кора', 'Повышает концентрацию'],
    benefits_en: ['Improves balance and coordination', 'Relieves stress', 'Strengthens core muscles', 'Increases concentration'],
    instructions_ru: [
      'Начните в позе горы (тадасана)',
      'Перейдите в позу воина III',
      'Выполните позу дерева',
      'Завершите позой ребенка',
      'Повторите последовательность 3-5 раз'
    ],
    instructions_en: [
      'Start in mountain pose (tadasana)',
      'Transition to warrior III pose',
      'Perform tree pose',
      'Finish with child pose',
      'Repeat the sequence 3-5 times'
    ],
    tips_ru: [
      'Сосредоточьтесь на дыхании',
      'Двигайтесь медленно и плавно',
      'Не форсируйте позы',
      'Используйте коврик для йоги'
    ],
    tips_en: [
      'Focus on breathing',
      'Move slowly and smoothly',
      'Don\'t force poses',
      'Use a yoga mat'
    ]
  },
  '13': {
    benefits_ru: ['Развивает координацию движений', 'Улучшает ловкость', 'Повышает скорость реакции', 'Укрепляет мышцы ног'],
    benefits_en: ['Develops movement coordination', 'Improves agility', 'Increases reaction speed', 'Strengthens leg muscles'],
    instructions_ru: [
      'Поставьте лестницу координации на пол',
      'Начните с простого шага в каждую ячейку',
      'Постепенно увеличивайте скорость',
      'Добавьте боковые движения',
      'Выполните 3-5 подходов по 2-3 минуты'
    ],
    instructions_en: [
      'Place coordination ladder on the floor',
      'Start with simple step in each cell',
      'Gradually increase speed',
      'Add lateral movements',
      'Perform 3-5 sets of 2-3 minutes'
    ],
    tips_ru: [
      'Начинайте медленно, затем ускоряйтесь',
      'Следите за правильной техникой',
      'Отдыхайте между подходами',
      'Используйте разные варианты движений'
    ],
    tips_en: [
      'Start slowly, then accelerate',
      'Watch for proper technique',
      'Rest between sets',
      'Use different movement variations'
    ]
  },
  '14': {
    benefits_ru: ['Развивает координацию рук и глаз', 'Улучшает концентрацию', 'Повышает ловкость', 'Тренирует периферическое зрение'],
    benefits_en: ['Develops hand-eye coordination', 'Improves concentration', 'Increases agility', 'Trains peripheral vision'],
    instructions_ru: [
      'Начните с одного мяча',
      'Подбрасывайте мяч одной рукой',
      'Когда освоитесь, добавьте второй мяч',
      'Попробуйте жонглировать двумя мячами',
      'Постепенно добавляйте третий мяч'
    ],
    instructions_en: [
      'Start with one ball',
      'Toss the ball with one hand',
      'When comfortable, add a second ball',
      'Try juggling with two balls',
      'Gradually add a third ball'
    ],
    tips_ru: [
      'Начинайте с мягких мячей',
      'Практикуйтесь регулярно',
      'Не расстраивайтесь из-за ошибок',
      'Сосредоточьтесь на ритме'
    ],
    tips_en: [
      'Start with soft balls',
      'Practice regularly',
      'Don\'t get discouraged by mistakes',
      'Focus on rhythm'
    ]
  },
  '15': {
    benefits_ru: ['Развивает скорость реакции', 'Улучшает координацию', 'Повышает ловкость', 'Тренирует периферическое зрение'],
    benefits_en: ['Develops reaction speed', 'Improves coordination', 'Increases agility', 'Trains peripheral vision'],
    instructions_ru: [
      'Расставьте конусы на расстоянии 1-2 метра',
      'Быстро касайтесь каждого конуса рукой',
      'Меняйте направление движения',
      'Увеличивайте скорость постепенно',
      'Выполните 3-5 подходов по 30 секунд'
    ],
    instructions_en: [
      'Place cones 1-2 meters apart',
      'Quickly touch each cone with your hand',
      'Change direction of movement',
      'Gradually increase speed',
      'Perform 3-5 sets of 30 seconds'
    ],
    tips_ru: [
      'Следите за правильной техникой',
      'Не торопитесь в начале',
      'Отдыхайте между подходами',
      'Используйте разные паттерны движения'
    ],
    tips_en: [
      'Watch for proper technique',
      'Don\'t rush at the beginning',
      'Rest between sets',
      'Use different movement patterns'
    ]
  }
};

async function fillExerciseDetails() {
  try {
    console.log('🔄 Заполняем недостающие детали упражнений...\n');

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


