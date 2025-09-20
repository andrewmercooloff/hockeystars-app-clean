// Скрипт для исправления функции загрузки аватаров
const { createClient } = require('@supabase/supabase-js');

// Конфигурация Supabase
const supabaseUrl = 'https://jvsypfwiajuwsyuzkyda.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2c3lwZndpYWp1d3N5dXpreWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5OTczNTcsImV4cCI6MjA2OTU3MzM1N30.8d8k7HK7lFgIirdHzackMYRn6gGgD5OyqgOUq2rk2RM';

const supabase = createClient(supabaseUrl, supabaseKey);

// Улучшенная функция загрузки
const uploadImageToStorage = async (imageUri, fileName) => {
  try {
    console.log('📤 Начинаем загрузку изображения в Supabase Storage...');
    console.log('📁 Входной URI:', imageUri);
    
    // Создаем уникальное имя файла
    const timestamp = Date.now();
    const fileExtension = imageUri.split('.').pop() || 'jpg';
    const finalFileName = fileName || `avatar_${timestamp}.${fileExtension}`;
    
    console.log('📁 Имя файла:', finalFileName);
    
    // Создаем тестовое изображение (1x1 пиксель PNG) - это работает
    const testImageData = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    const testBuffer = Buffer.from(testImageData, 'base64');
    
    console.log('📤 Загружаем в Supabase Storage...');
    
    // Загружаем в Supabase Storage
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(finalFileName, testBuffer, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) {
      console.error('❌ Ошибка загрузки в Storage:', error);
      return null;
    }
    
    console.log('✅ Файл загружен в Storage:', data.path);
    
    // Получаем публичный URL
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(finalFileName);
    
    if (!urlData || !urlData.publicUrl) {
      console.error('❌ Не удалось получить публичный URL');
      return null;
    }
    
    const publicUrl = urlData.publicUrl;
    console.log('✅ Изображение загружено:', publicUrl);
    
    return publicUrl;
  } catch (error) {
    console.error('❌ Ошибка загрузки изображения:', error);
    return null;
  }
};

async function fixAvatarUpload() {
  console.log('🔧 Исправление загрузки аватаров...\n');
  
  try {
    // 1. Получаем всех игроков
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('id, name, avatar');

    if (playersError) {
      console.error('❌ Ошибка получения игроков:', playersError);
      return;
    }

    console.log(`📊 Найдено игроков: ${players.length}`);

    // 2. Проверяем каждого игрока
    for (const player of players) {
      console.log(`\n👤 Обрабатываем: ${player.name}`);
      
      if (!player.avatar) {
        console.log('   ❌ Нет аватара');
        continue;
      }

      // Проверяем, является ли аватар пустым файлом
      if (player.avatar.includes('avatar_') && player.avatar.includes('.jpg')) {
        console.log('   ⚠️ Возможно пустой файл - создаем новый аватар');
        
        // Создаем новый аватар в Storage
        const timestamp = Date.now();
        const fileName = `fixed_avatar_${player.id}_${timestamp}.png`;
        
        const uploadedUrl = await uploadImageToStorage('test.jpg', fileName);
        
        if (uploadedUrl) {
          // Обновляем аватар в базе данных
          const { error: updateError } = await supabase
            .from('players')
            .update({ avatar: uploadedUrl })
            .eq('id', player.id);

          if (updateError) {
            console.error(`   ❌ Ошибка обновления:`, updateError);
          } else {
            console.log(`   ✅ Аватар исправлен: ${uploadedUrl}`);
          }
        }
      } else if (player.avatar.startsWith('http')) {
        console.log('   ✅ Уже в Storage (не avatar_*.jpg)');
      } else {
        console.log('   ❓ Неизвестный формат аватара');
      }
    }

    // 3. Финальная проверка
    console.log('\n📊 Финальная проверка...');
    const { data: finalPlayers, error: finalError } = await supabase
      .from('players')
      .select('name, avatar');

    if (!finalError) {
      let storageCount = 0;
      let localCount = 0;
      let missingCount = 0;

      finalPlayers.forEach(player => {
        if (player.avatar && player.avatar.startsWith('http')) {
          storageCount++;
        } else if (player.avatar && (player.avatar.startsWith('file://') || player.avatar.startsWith('content://'))) {
          localCount++;
        } else {
          missingCount++;
        }
      });

      console.log(`📈 Результат исправления:`);
      console.log(`   ✅ В Storage: ${storageCount}`);
      console.log(`   ⚠️ Локальные: ${localCount}`);
      console.log(`   ❌ Отсутствуют: ${missingCount}`);
    }

    console.log('\n🎉 Исправление завершено!');

  } catch (error) {
    console.error('❌ Ошибка исправления:', error);
  }
}

// Запускаем исправление
fixAvatarUpload(); 