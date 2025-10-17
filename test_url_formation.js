// Скрипт для тестирования формирования URL в Supabase Storage
const { createClient } = require('@supabase/supabase-js');

// Конфигурация Supabase
const supabaseUrl = 'https://jvsypfwiajuwsyuzkyda.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2c3lwZndpYWp1d3N5dXpreWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5OTczNTcsImV4cCI6MjA2OTU3MzM1N30.8d8k7HK7lFgIirdHzackMYRn6gGgD5OyqgOUq2rk2RM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUrlFormation() {
  console.log('🔍 Тестирование формирования URL...\n');
  
  // Тестируем разные варианты имен файлов
  const testFileNames = [
    'avatar_1754256540827.jpg',
    '/avatar_1754256540827.jpg',  // со слешем в начале
    'avatar_1754256540827.jpg/',  // со слешем в конце
    '/avatar_1754256540827.jpg/', // со слешами с обеих сторон
    'test_avatar.jpg',
    '/test_avatar.jpg'
  ];
  
  for (const fileName of testFileNames) {
    console.log(`📁 Тестируем: "${fileName}"`);
    
    try {
      // Получаем публичный URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);
      
      if (urlData && urlData.publicUrl) {
        console.log(`✅ URL: ${urlData.publicUrl}`);
        
        // Проверяем, есть ли двойной слеш
        if (urlData.publicUrl.includes('avatars//')) {
          console.log('⚠️  ОБНАРУЖЕН ДВОЙНОЙ СЛЕШ!');
        }
      } else {
        console.log('❌ Не удалось получить URL');
      }
    } catch (error) {
      console.log('❌ Ошибка:', error.message);
    }
    
    console.log('');
  }
  
  // Проверяем существующий файл
  console.log('📋 Проверяем существующие файлы...');
  try {
    const { data: files, error } = await supabase.storage
      .from('avatars')
      .list('', { limit: 10 });
    
    if (!error && files) {
      for (const file of files) {
        console.log(`📁 Файл: "${file.name}"`);
        
        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(file.name);
        
        if (urlData && urlData.publicUrl) {
          console.log(`🔗 URL: ${urlData.publicUrl}`);
          if (urlData.publicUrl.includes('avatars//')) {
            console.log('⚠️  ДВОЙНОЙ СЛЕШ В URL!');
          }
        }
        console.log('');
      }
    }
  } catch (error) {
    console.error('❌ Ошибка получения списка файлов:', error);
  }
}

// Запускаем тест
testUrlFormation(); 