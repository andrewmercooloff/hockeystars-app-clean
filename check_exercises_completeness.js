const { createClient } = require('@supabase/supabase-js');

// Конфигурация Supabase
const supabaseUrl = 'https://jvsypfwiajuwsyuzkyda.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2c3lwZndpYWp1d3N5dXpreWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5OTczNTcsImV4cCI6MjA2OTU3MzM1N30.8d8k7HK7lFgIirdHzackMYRn6gGgD5OyqgOUq2rk2RM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkExercisesCompleteness() {
  try {
    console.log('🔍 Проверяем полноту упражнений в базе данных...\n');

    // Получаем все упражнения
    const { data: exercises, error } = await supabase
      .from('exercises')
      .select('*')
      .order('exercise_id', { ascending: true });

    if (error) {
      console.error('❌ Ошибка получения упражнений:', error);
      return;
    }

    console.log(`📊 Всего упражнений в базе: ${exercises.length}\n`);

    // Проверяем каждое упражнение на полноту
    let incompleteExercises = [];
    let completeExercises = 0;

    exercises.forEach((exercise, index) => {
      const issues = [];
      
      // Проверяем основные поля
      if (!exercise.title_ru || exercise.title_ru.trim() === '') issues.push('title_ru');
      if (!exercise.title_en || exercise.title_en.trim() === '') issues.push('title_en');
      if (!exercise.description_ru || exercise.description_ru.trim() === '') issues.push('description_ru');
      if (!exercise.description_en || exercise.description_en.trim() === '') issues.push('description_en');
      
      // Проверяем массивы (в базе они хранятся как JSONB)
      if (!exercise.benefits_ru || (Array.isArray(exercise.benefits_ru) && exercise.benefits_ru.length === 0)) issues.push('benefits_ru');
      if (!exercise.benefits_en || (Array.isArray(exercise.benefits_en) && exercise.benefits_en.length === 0)) issues.push('benefits_en');
      if (!exercise.instructions_ru || (Array.isArray(exercise.instructions_ru) && exercise.instructions_ru.length === 0)) issues.push('instructions_ru');
      if (!exercise.instructions_en || (Array.isArray(exercise.instructions_en) && exercise.instructions_en.length === 0)) issues.push('instructions_en');
      if (!exercise.tips_ru || (Array.isArray(exercise.tips_ru) && exercise.tips_ru.length === 0)) issues.push('tips_ru');
      if (!exercise.tips_en || (Array.isArray(exercise.tips_en) && exercise.tips_en.length === 0)) issues.push('tips_en');
      
      // Проверяем опциональные поля
      if (!exercise.equipment_ru || exercise.equipment_ru.trim() === '') issues.push('equipment_ru');
      if (!exercise.equipment_en || exercise.equipment_en.trim() === '') issues.push('equipment_en');
      if (!exercise.calories_ru || exercise.calories_ru.trim() === '') issues.push('calories_ru');
      if (!exercise.calories_en || exercise.calories_en.trim() === '') issues.push('calories_en');

      if (issues.length > 0) {
        incompleteExercises.push({
          id: exercise.exercise_id,
          title: exercise.title_ru || exercise.title_en || 'Без названия',
          issues: issues
        });
      } else {
        completeExercises++;
      }
    });

    console.log(`✅ Полностью заполненных упражнений: ${completeExercises}`);
    console.log(`❌ Неполных упражнений: ${incompleteExercises.length}\n`);

    if (incompleteExercises.length > 0) {
      console.log('📋 Список неполных упражнений:');
      incompleteExercises.forEach(exercise => {
        console.log(`\n🔸 Упражнение ${exercise.id}: ${exercise.title}`);
        console.log(`   Проблемы: ${exercise.issues.join(', ')}`);
      });
    }

    // Статистика по категориям
    const categories = {};
    exercises.forEach(exercise => {
      const category = exercise.category || 'Без категории';
      if (!categories[category]) {
        categories[category] = { total: 0, complete: 0 };
      }
      categories[category].total++;
      
      const hasIssues = incompleteExercises.find(inc => inc.id === exercise.exercise_id);
      if (!hasIssues) {
        categories[category].complete++;
      }
    });

    console.log('\n📊 Статистика по категориям:');
    Object.entries(categories).forEach(([category, stats]) => {
      const percentage = Math.round((stats.complete / stats.total) * 100);
      console.log(`   ${category}: ${stats.complete}/${stats.total} (${percentage}%)`);
    });

  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}

checkExercisesCompleteness();
