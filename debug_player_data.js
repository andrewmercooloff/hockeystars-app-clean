const { createClient } = require('@supabase/supabase-js');

// Конфигурация Supabase
const supabaseUrl = 'https://your-project.supabase.co';
const supabaseKey = 'your-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugPlayerData() {
  console.log('🔍 Отладка данных игроков...\n');

  try {
    // Получаем всех игроков
    const { data: players, error } = await supabase
      .from('players')
      .select('*')
      .order('name');

    if (error) {
      console.error('❌ Ошибка получения игроков:', error);
      return;
    }

    console.log(`📊 Найдено игроков: ${players.length}\n`);

    // Проверяем каждого игрока
    players.forEach((player, index) => {
      console.log(`\n--- Игрок ${index + 1}: ${player.name} ---`);
      console.log('ID:', player.id);
      console.log('Статус:', player.status);
      console.log('Команда:', player.team);
      console.log('Позиция:', player.position);
      
      // Проверяем дату начала хоккея
      console.log('Дата начала хоккея (hockey_start_date):', player.hockey_start_date);
      if (player.hockey_start_date) {
        console.log('✅ Дата начала хоккея есть');
        
        // Проверяем формат даты
        const dateParts = player.hockey_start_date.split('.');
        if (dateParts.length === 2) {
          const month = parseInt(dateParts[0]);
          const year = parseInt(dateParts[1]);
          console.log('Месяц:', month, 'Год:', year);
          
          if (month >= 1 && month <= 12 && year >= 1900 && year <= 2030) {
            console.log('✅ Формат даты корректный');
            
            // Рассчитываем опыт
            const start = new Date(year, month - 1);
            const now = new Date();
            let years = now.getFullYear() - start.getFullYear();
            let months = now.getMonth() - start.getMonth();
            if (months < 0) {
              years--;
              months += 12;
            }
            
            const getYearWord = (num) => {
              if (num === 1) return 'год';
              if (num >= 2 && num <= 4) return 'года';
              return 'лет';
            };
            
            const experience = years > 0 ? `${years} ${getYearWord(years)}` : `${months} мес.`;
            console.log('📅 Рассчитанный опыт:', experience);
          } else {
            console.log('❌ Некорректный формат даты');
          }
        } else {
          console.log('❌ Неправильный формат даты (ожидается MM.YYYY)');
        }
      } else {
        console.log('❌ Дата начала хоккея отсутствует');
      }
      
      // Проверяем нормативы
      console.log('\n📊 Нормативы:');
      console.log('Подтягивания:', player.pull_ups);
      console.log('Отжимания:', player.push_ups);
      console.log('Планка:', player.plank_time);
      console.log('100м:', player.sprint_100m);
      console.log('Прыжок в длину:', player.long_jump);
      
      const hasNormatives = player.pull_ups || player.push_ups || player.plank_time || player.sprint_100m || player.long_jump;
      console.log('Есть нормативы:', hasNormatives ? '✅' : '❌');
      
      // Проверяем видео
      console.log('\n🎥 Видео моментов:');
      console.log('favorite_goals:', player.favorite_goals);
      if (player.favorite_goals) {
        const videos = player.favorite_goals.split('\n').filter(goal => goal.trim());
        console.log('Количество видео:', videos.length);
        videos.forEach((video, i) => {
          console.log(`  Видео ${i + 1}:`, video);
        });
      } else {
        console.log('❌ Видео отсутствуют');
      }
      
      // Проверяем фотографии
      console.log('\n📸 Фотографии:');
      console.log('photos:', player.photos);
      if (player.photos) {
        try {
          const photos = JSON.parse(player.photos);
          console.log('Количество фотографий:', photos.length);
        } catch (e) {
          console.log('❌ Ошибка парсинга фотографий:', e.message);
        }
      } else {
        console.log('❌ Фотографии отсутствуют');
      }
      
      console.log('\n' + '='.repeat(50));
    });

  } catch (error) {
    console.error('❌ Общая ошибка:', error);
  }
}

// Запускаем отладку
debugPlayerData(); 