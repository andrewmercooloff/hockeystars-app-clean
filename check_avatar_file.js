// Скрипт для проверки конкретного файла аватара
const { createClient } = require('@supabase/supabase-js');

// Конфигурация Supabase
const supabaseUrl = 'https://jvsypfwiajuwsyuzkyda.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2c3lwZndpYWp1d3N5dXpreWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5OTczNTcsImV4cCI6MjA2OTU3MzM1N30.8d8k7HK7lFgIirdHzackMYRn6gGgD5OyqgOUq2rk2RM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAvatarFile() {
  console.log('🔍 Проверка файла аватара...\n');
  
  try {
    // Проверяем файл администратора
    const fileName = 'avatar_1754256540827.jpg';
    
    console.log('📁 Проверяем файл:', fileName);
    
    // 1. Получаем информацию о файле
    const { data: fileList, error: listError } = await supabase.storage
      .from('avatars')
      .list('', {
        limit: 1000,
        search: fileName
      });
    
    if (listError) {
      console.error('❌ Ошибка получения списка файлов:', listError);
      return;
    }
    
    const file = fileList.find(f => f.name === fileName);
    if (!file) {
      console.error('❌ Файл не найден в списке');
      return;
    }
    
    console.log('📊 Информация о файле:');
    console.log('   Имя:', file.name);
    console.log('   Размер:', file.metadata?.size || 'неизвестно', 'байт');
    console.log('   Тип:', file.metadata?.mimetype || 'неизвестно');
    console.log('   Обновлен:', file.updated_at);
    
    // 2. Пытаемся скачать файл
    console.log('\n📥 Пытаемся скачать файл...');
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('avatars')
      .download(fileName);
    
    if (downloadError) {
      console.error('❌ Ошибка скачивания:', downloadError);
      return;
    }
    
    if (!fileData) {
      console.error('❌ Файл пустой при скачивании');
      return;
    }
    
    console.log('✅ Файл скачан успешно');
    console.log('📊 Размер скачанного файла:', fileData.size, 'байт');
    
    // 3. Проверяем публичный URL
    console.log('\n🔗 Проверяем публичный URL...');
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);
    
    if (urlData && urlData.publicUrl) {
      console.log('✅ Публичный URL:', urlData.publicUrl);
      
      // 4. Проверяем доступность через HTTP
      console.log('\n🌐 Проверяем доступность через HTTP...');
      try {
        const response = await fetch(urlData.publicUrl);
        console.log('📊 HTTP статус:', response.status, response.statusText);
        console.log('📊 Content-Type:', response.headers.get('content-type'));
        console.log('📊 Content-Length:', response.headers.get('content-length'), 'байт');
        
        if (response.ok) {
          const buffer = await response.arrayBuffer();
          console.log('📊 Размер полученных данных:', buffer.byteLength, 'байт');
          
          if (buffer.byteLength === 0) {
            console.error('❌ Файл пустой при HTTP запросе!');
          } else {
            console.log('✅ Файл доступен и не пустой');
          }
        } else {
          console.error('❌ HTTP запрос не удался');
        }
      } catch (httpError) {
        console.error('❌ Ошибка HTTP запроса:', httpError);
      }
    }
    
    // 5. Проверяем все файлы в bucket
    console.log('\n📋 Список всех файлов в bucket:');
    const { data: allFiles, error: allFilesError } = await supabase.storage
      .from('avatars')
      .list('', { limit: 1000 });
    
    if (!allFilesError && allFiles) {
      allFiles.forEach(f => {
        const size = f.metadata?.size || 0;
        const isZero = size === 0 ? ' (ПУСТОЙ!)' : '';
        console.log(`   ${f.name}: ${size} байт${isZero}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Ошибка проверки:', error);
  }
}

// Запускаем проверку
checkAvatarFile(); 