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
  }
};

async function updateAllExercises() {
  try {
    console.log('🔄 Обновляем все упражнения...\n');

    let updatedCount = 0;
    let errorCount = 0;

    for (const [exerciseId, details] of Object.entries(exerciseDetails)) {
      console.log(`📝 Обновляем упражнение ${exerciseId}...`);
      
      try {
        // Пробуем обновить через RPC функцию
        const { data, error } = await supabase.rpc('update_exercise_details', {
          p_exercise_id: exerciseId,
          p_benefits_ru: details.benefits_ru,
          p_benefits_en: details.benefits_en,
          p_instructions_ru: details.instructions_ru,
          p_instructions_en: details.instructions_en,
          p_tips_ru: details.tips_ru,
          p_tips_en: details.tips_en
        });

        if (error) {
          console.error(`❌ Ошибка RPC для упражнения ${exerciseId}:`, error.message);
          
          // Пробуем обычное обновление
          const { error: updateError } = await supabase
            .from('exercises')
            .update(details)
            .eq('exercise_id', exerciseId);

          if (updateError) {
            console.error(`❌ Ошибка обновления упражнения ${exerciseId}:`, updateError.message);
            errorCount++;
          } else {
            console.log(`✅ Упражнение ${exerciseId} обновлено через обычное обновление`);
            updatedCount++;
          }
        } else {
          console.log(`✅ Упражнение ${exerciseId} обновлено через RPC`);
          updatedCount++;
        }
      } catch (err) {
        console.error(`❌ Исключение при обновлении упражнения ${exerciseId}:`, err.message);
        errorCount++;
      }
    }

    console.log(`\n🎉 Обновление завершено!`);
    console.log(`✅ Успешно обновлено: ${updatedCount} упражнений`);
    console.log(`❌ Ошибок: ${errorCount} упражнений`);

  } catch (error) {
    console.error('❌ Общая ошибка:', error);
  }
}

updateAllExercises();


