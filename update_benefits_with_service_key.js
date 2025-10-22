const { createClient } = require('@supabase/supabase-js');

// Конфигурация Supabase с service role key
const supabaseUrl = 'https://jvsypfwiajuwsyuzkyda.supabase.co';
// Попробуем найти service role key в других файлах
const serviceKey = 'REDACTED_SUPABASE_SERVICE_ROLE_KEY';

const supabase = createClient(supabaseUrl, serviceKey);

// Переводы пользы упражнений с английского на русский
const benefitsTranslations = {
  "Warms up neck muscles": "Разогревает мышцы шеи",
  "Prevents neck injuries": "Предотвращает травмы шеи",
  "Improves neck mobility": "Улучшает подвижность шеи",
  "Relieves tension": "Снимает напряжение",
  
  "Warms up wrist joints": "Разогревает суставы запястий",
  "Prevents wrist injuries": "Предотвращает травмы запястий",
  "Improves wrist flexibility": "Улучшает гибкость запястий",
  
  "Warms up knee joints": "Разогревает коленные суставы",
  "Prevents knee injuries": "Предотвращает травмы коленей",
  "Improves knee mobility": "Улучшает подвижность коленей",
  "Prepares for loads": "Подготавливает к нагрузкам",
  
  "Warms up hip joints": "Разогревает тазобедренные суставы",
  "Prevents hip injuries": "Предотвращает травмы тазобедренных суставов",
  "Improves hip mobility": "Улучшает подвижность тазобедренных суставов",
  
  "Improves groin flexibility": "Улучшает гибкость паха",
  "Prevents groin injuries": "Предотвращает травмы паха",
  "Improves mobility": "Улучшает подвижность",
  
  "Improves hamstring flexibility": "Улучшает гибкость подколенных сухожилий",
  "Prevents hamstring injuries": "Предотвращает травмы подколенных сухожилий",
  
  "Improves calf flexibility": "Улучшает гибкость икроножных мышц",
  "Prevents calf injuries": "Предотвращает травмы икроножных мышц",
  
  "Improves chest flexibility": "Улучшает гибкость грудных мышц",
  "Prevents chest injuries": "Предотвращает травмы грудных мышц",
  "Improves posture": "Улучшает осанку",
  
  "Improves tricep flexibility": "Улучшает гибкость трицепсов",
  "Prevents tricep injuries": "Предотвращает травмы трицепсов",
  
  "Develops agility": "Развивает ловкость",
  "Improves coordination": "Улучшает координацию",
  "Increases speed": "Увеличивает скорость",
  "Strengthens leg muscles": "Укрепляет мышцы ног",
  
  "Develops foot speed": "Развивает скорость ног",
  "Increases agility": "Увеличивает ловкость",
  
  "Develops explosive power": "Развивает взрывную силу",
  
  "Develops hand-eye coordination": "Развивает зрительно-моторную координацию",
  "Improves reaction speed": "Улучшает скорость реакции",
  "Strengthens arm muscles": "Укрепляет мышцы рук",
  
  "Develops coordination": "Развивает координацию",
  "Improves balance": "Улучшает баланс",
  
  "Develops power": "Развивает силу",
  "Increases muscle mass": "Увеличивает мышечную массу",
  
  "Strengthens back muscles": "Укрепляет мышцы спины",
  
  "Strengthens chest muscles": "Укрепляет мышцы груди",
  "Improves upper body strength": "Улучшает силу верхней части тела",
  
  "Strengthens back and arm muscles": "Укрепляет мышцы спины и рук",
  "Improves grip strength": "Улучшает силу хвата",
  
  "Strengthens chest and arm muscles": "Укрепляет мышцы груди и рук",
  
  "Develops stability": "Развивает стабильность",
  "Increases coordination": "Увеличивает координацию",
  
  "Strengthens core muscles": "Укрепляет мышцы кора",
  "Increases flexibility": "Увеличивает гибкость",
  
  "Strengthens arm and shoulder muscles": "Укрепляет мышцы рук и плеч",
  
  "Develops endurance": "Развивает выносливость",
  "Improves cardiovascular fitness": "Улучшает сердечно-сосудистую подготовку",
  "Burns calories": "Сжигает калории",
  
  "Increases leg strength": "Увеличивает силу ног",
  
  "Improves flexibility": "Улучшает гибкость",
  "Relieves muscle tension": "Снимает мышечное напряжение",
  "Reduces stress": "Снижает стресс",
  
  "Improves circulation": "Улучшает кровообращение",
  "Reduces soreness": "Уменьшает болезненность",
  
  "Improves mood": "Улучшает настроение",
  
  "Strengthens all muscles": "Укрепляет все мышцы",
  "Low impact exercise": "Низкоударное упражнение",
  
  "Reduces muscle soreness": "Уменьшает мышечную болезненность",
  
  "Boosts immune system": "Укрепляет иммунную систему"
};

function translateBenefits(enBenefits) {
  return enBenefits.map(benefit => {
    return benefitsTranslations[benefit] || benefit;
  });
}

async function updateBenefitsWithServiceKey() {
  try {
    console.log('🔧 Обновляем пользу упражнений с service role key...\n');

    // Получаем упражнения без пользы на русском
    const { data: exercises, error } = await supabase
      .from('exercises')
      .select('exercise_id, title_ru, title_en, benefits_ru, benefits_en')
      .eq('is_active', true)
      .order('exercise_id');

    if (error) {
      console.error('❌ Ошибка загрузки упражнений:', error);
      return;
    }

    const missingRuBenefits = exercises.filter(exercise => {
      const hasRuBenefits = exercise.benefits_ru && 
        Array.isArray(exercise.benefits_ru) && 
        exercise.benefits_ru.length > 0;
      
      const hasEnBenefits = exercise.benefits_en && 
        Array.isArray(exercise.benefits_en) && 
        exercise.benefits_en.length > 0;

      return !hasRuBenefits && hasEnBenefits;
    });

    console.log(`📊 Найдено упражнений без пользы на русском: ${missingRuBenefits.length}\n`);

    let updated = 0;
    let errors = 0;

    for (const exercise of missingRuBenefits) {
      try {
        console.log(`🔄 Обновляем упражнение ${exercise.exercise_id}: ${exercise.title_ru}`);
        
        const translatedBenefits = translateBenefits(exercise.benefits_en);
        console.log(`   EN: ${exercise.benefits_en.join(', ')}`);
        console.log(`   RU: ${translatedBenefits.join(', ')}`);

        const { data: updateData, error: updateError } = await supabase
          .from('exercises')
          .update({ 
            benefits_ru: translatedBenefits,
            updated_at: new Date().toISOString()
          })
          .eq('exercise_id', exercise.exercise_id)
          .select('exercise_id, benefits_ru');

        if (updateError) {
          console.error(`   ❌ Ошибка обновления: ${updateError.message}`);
          errors++;
        } else {
          console.log(`   ✅ Обновлено успешно: ${JSON.stringify(updateData)}`);
          updated++;
        }
        
        console.log('');

      } catch (error) {
        console.error(`   ❌ Ошибка обработки упражнения ${exercise.exercise_id}:`, error.message);
        errors++;
      }
    }

    console.log('📈 Результаты:');
    console.log(`✅ Успешно обновлено: ${updated}`);
    console.log(`❌ Ошибок: ${errors}`);

  } catch (error) {
    console.error('❌ Общая ошибка:', error);
  }
}

updateBenefitsWithServiceKey();
