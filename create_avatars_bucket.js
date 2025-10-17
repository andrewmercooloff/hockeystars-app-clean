// Скрипт для создания bucket avatars через JavaScript API
const { createClient } = require('@supabase/supabase-js');

// Конфигурация Supabase
const supabaseUrl = 'https://jvsypfwiajuwsyuzkyda.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2c3lwZndpYWp1d3N5dXpreWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5OTczNTcsImV4cCI6MjA2OTU3MzM1N30.8d8k7HK7lFgIirdHzackMYRn6gGgD5OyqgOUq2rk2RM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createAvatarsBucket() {
  console.log('🔧 Создание bucket avatars...\n');

  try {
    // 1. Проверяем существующие buckets
    console.log('1️⃣ Проверяем существующие buckets...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('❌ Ошибка получения buckets:', bucketsError);
      return;
    }

    console.log('📦 Существующие buckets:');
    buckets.forEach(bucket => {
      console.log(`   - ${bucket.name} (public: ${bucket.public})`);
    });

    // 2. Проверяем, существует ли уже bucket avatars
    const existingBucket = buckets.find(b => b.name === 'avatars');
    if (existingBucket) {
      console.log('\n✅ Bucket "avatars" уже существует');
      console.log(`   - Public: ${existingBucket.public}`);
      console.log(`   - File size limit: ${existingBucket.file_size_limit} bytes`);
      return;
    }

    // 3. Создаем bucket avatars
    console.log('\n2️⃣ Создаем bucket avatars...');
    const { data: newBucket, error: createError } = await supabase.storage.createBucket('avatars', {
      public: true,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      fileSizeLimit: 5242880 // 5MB
    });

    if (createError) {
      console.error('❌ Ошибка создания bucket:', createError);
      return;
    }

    console.log('✅ Bucket "avatars" создан успешно!');
    console.log(`   - Name: ${newBucket.name}`);
    console.log(`   - Public: ${newBucket.public}`);
    console.log(`   - File size limit: ${newBucket.file_size_limit} bytes`);

    // 4. Проверяем создание
    console.log('\n3️⃣ Проверяем создание bucket...');
    const { data: verifyBuckets, error: verifyError } = await supabase.storage.listBuckets();
    
    if (verifyError) {
      console.error('❌ Ошибка проверки:', verifyError);
      return;
    }

    const createdBucket = verifyBuckets.find(b => b.name === 'avatars');
    if (createdBucket) {
      console.log('✅ Bucket успешно создан и доступен');
    } else {
      console.log('❌ Bucket не найден после создания');
    }

    console.log('\n🎉 Bucket avatars готов к использованию!');
    console.log('💡 Теперь можно использовать функции миграции изображений в приложении');

  } catch (error) {
    console.error('❌ Ошибка создания bucket:', error);
  }
}

// Запускаем создание bucket
createAvatarsBucket(); 