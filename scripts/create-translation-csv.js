const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Подключение к Supabase
const supabaseUrl = 'https://jvsypfwiajuwsyuzkyda.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2c3lwZndpYWp1d3N5dXpreWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5OTczNTcsImV4cCI6MjA2OTU3MzM1N30.8d8k7HK7lFgIirdHzackMYRn6gGgD5OyqgOUq2rk2RM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTranslationCSV() {
  try {
    console.log('📊 Создаем CSV файл для перевода...');
    
    // Получаем все упражнения с обновленными инструкциями и советами
    const { data: exercises, error } = await supabase
      .from('exercises')
      .select('exercise_id, title_ru, instructions_ru, tips_ru, equipment_ru, calories_ru, category_ru, difficulty_ru, duration_ru')
      .eq('is_active', true)
      .order('exercise_id');

    if (error) {
      console.error('❌ Ошибка получения упражнений:', error);
      return;
    }

    // Создаем CSV заголовки
    const headers = [
      'Exercise ID',
      'Title (RU)',
      'Instructions (RU)',
      'Tips (RU)',
      'Equipment (RU)',
      'Calories (RU)',
      'Category (RU)',
      'Difficulty (RU)',
      'Duration (RU)',
      'Instructions (EN)',
      'Tips (EN)',
      'Equipment (EN)',
      'Calories (EN)',
      'Category (EN)',
      'Difficulty (EN)',
      'Duration (EN)'
    ];

    // Создаем строки данных
    const rows = exercises.map(exercise => {
      const instructions = Array.isArray(exercise.instructions_ru) 
        ? exercise.instructions_ru.join(' | ') 
        : exercise.instructions_ru || '';
      const tips = Array.isArray(exercise.tips_ru) 
        ? exercise.tips_ru.join(' | ') 
        : exercise.tips_ru || '';
      
      return [
        exercise.exercise_id,
        `"${exercise.title_ru}"`,
        `"${instructions}"`,
        `"${tips}"`,
        `"${exercise.equipment_ru || ''}"`,
        `"${exercise.calories_ru || ''}"`,
        `"${exercise.category_ru || ''}"`,
        `"${exercise.difficulty_ru || ''}"`,
        `"${exercise.duration_ru || ''}"`,
        `"=GOOGLETRANSLATE(D${exercises.indexOf(exercise) + 2},"ru","en")"`, // Формула для перевода инструкций
        `"=GOOGLETRANSLATE(E${exercises.indexOf(exercise) + 2},"ru","en")"`, // Формула для перевода советов
        `"=GOOGLETRANSLATE(F${exercises.indexOf(exercise) + 2},"ru","en")"`, // Формула для перевода оборудования
        `"=GOOGLETRANSLATE(G${exercises.indexOf(exercise) + 2},"ru","en")"`, // Формула для перевода калорий
        `"=GOOGLETRANSLATE(H${exercises.indexOf(exercise) + 2},"ru","en")"`, // Формула для перевода категории
        `"=GOOGLETRANSLATE(I${exercises.indexOf(exercise) + 2},"ru","en")"`, // Формула для перевода сложности
        `"=GOOGLETRANSLATE(J${exercises.indexOf(exercise) + 2},"ru","en")"`  // Формула для перевода длительности
      ].join(',');
    });

    // Создаем CSV контент
    const csvContent = [headers.join(','), ...rows].join('\n');
    
    // Сохраняем файл
    const fs = require('fs');
    const path = require('path');
    const outputPath = path.join(__dirname, 'exercises-translation-template.csv');
    
    fs.writeFileSync(outputPath, csvContent, 'utf8');
    console.log(`✅ CSV файл для перевода сохранен: ${outputPath}`);
    
    // Также создаем файл только с русскими данными для справки
    const russianOnlyHeaders = headers.slice(0, 9); // Только русские колонки
    const russianOnlyRows = exercises.map(exercise => {
      const instructions = Array.isArray(exercise.instructions_ru) 
        ? exercise.instructions_ru.join(' | ') 
        : exercise.instructions_ru || '';
      const tips = Array.isArray(exercise.tips_ru) 
        ? exercise.tips_ru.join(' | ') 
        : exercise.tips_ru || '';
      
      return [
        exercise.exercise_id,
        `"${exercise.title_ru}"`,
        `"${instructions}"`,
        `"${tips}"`,
        `"${exercise.equipment_ru || ''}"`,
        `"${exercise.calories_ru || ''}"`,
        `"${exercise.category_ru || ''}"`,
        `"${exercise.difficulty_ru || ''}"`,
        `"${exercise.duration_ru || ''}"`
      ].join(',');
    });
    
    const russianCSVContent = [russianOnlyHeaders.join(','), ...russianOnlyRows].join('\n');
    const russianOutputPath = path.join(__dirname, 'exercises-russian-only.csv');
    fs.writeFileSync(russianOutputPath, russianCSVContent, 'utf8');
    console.log(`✅ Русский CSV файл сохранен: ${russianOutputPath}`);
    
    console.log('\n📋 Инструкции по использованию:');
    console.log('1. Откройте exercises-translation-template.csv в Google Sheets');
    console.log('2. Формулы GOOGLETRANSLATE автоматически переведут текст с русского на английский');
    console.log('3. Скопируйте переведенные колонки и вставьте в новый файл');
    console.log('4. Используйте exercises-russian-only.csv как справочник с русскими данными');

  } catch (error) {
    console.error('❌ Ошибка создания CSV:', error);
  }
}

// Запускаем создание CSV
createTranslationCSV();








