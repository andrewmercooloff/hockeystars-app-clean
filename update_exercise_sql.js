const { createClient } = require('@supabase/supabase-js');

// Конфигурация Supabase
const supabaseUrl = 'https://jvsypfwiajuwsyuzkyda.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2c3lwZndpYWp1d3N5dXpreWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5OTczNTcsImV4cCI6MjA2OTU3MzM1N30.8d8k7HK7lFgIirdHzackMYRn6gGgD5OyqgOUq2rk2RM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateExerciseWithSQL() {
  try {
    console.log('🔄 Обновляем упражнение через SQL...\n');

    // Обновляем упражнение 11 с правильным форматом JSON
    const { data, error } = await supabase
      .from('exercises')
      .update({
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
      })
      .eq('exercise_id', '11')
      .select();

    if (error) {
      console.error('❌ Ошибка обновления:', error);
      return;
    }

    console.log('✅ Упражнение 11 обновлено успешно');
    console.log('📋 Результат:', data);

  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}

updateExerciseWithSQL();


