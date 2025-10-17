// Скрипт для проверки текущего состояния базы данных
const { createClient } = require('@supabase/supabase-js');

// Конфигурация Supabase
const supabaseUrl = 'https://jvsypfwiajuwsyuzkyda.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2c3lwZndpYWp1d3N5dXpreWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5OTczNTcsImV4cCI6MjA2OTU3MzM1N30.8d8k7HK7lFgIirdHzackMYRn6gGgD5OyqgOUq2rk2RM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabaseStatus() {
  console.log('🔍 Проверка состояния базы данных...\n');

  try {
    // 1. Проверяем подключение к базе данных
    console.log('1️⃣ Проверяем подключение к базе данных...');
    const { data: testData, error: testError } = await supabase
      .from('players')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.error('❌ Ошибка подключения к базе данных:', testError);
      return;
    }
    console.log('✅ Подключение к базе данных работает');

    // 2. Проверяем таблицу storage.buckets напрямую
    console.log('\n2️⃣ Проверяем таблицу storage.buckets...');
    const { data: bucketsData, error: bucketsError } = await supabase
      .rpc('exec_sql', {
        query: 'SELECT id, name, public, file_size_limit, created_at FROM storage.buckets ORDER BY name;'
      });

    if (bucketsError) {
      console.log('⚠️ Не удалось проверить storage.buckets через RPC');
      console.log('🔍 Попробуем другой способ...');
      
      // Попробуем через прямой SQL запрос
      const { data: directBuckets, error: directError } = await supabase
        .from('storage.buckets')
        .select('*');
      
      if (directError) {
        console.error('❌ Ошибка прямого запроса к storage.buckets:', directError);
      } else {
        console.log('📦 Buckets в базе данных:');
        if (directBuckets && directBuckets.length > 0) {
          directBuckets.forEach(bucket => {
            console.log(`   - ${bucket.id} (public: ${bucket.public})`);
          });
        } else {
          console.log('   - Нет buckets в базе данных');
        }
      }
    } else {
      console.log('📦 Buckets в базе данных:');
      if (bucketsData && bucketsData.length > 0) {
        bucketsData.forEach(bucket => {
          console.log(`   - ${bucket.id} (public: ${bucket.public})`);
        });
      } else {
        console.log('   - Нет buckets в базе данных');
      }
    }

    // 3. Проверяем политики
    console.log('\n3️⃣ Проверяем политики storage.objects...');
    const { data: policiesData, error: policiesError } = await supabase
      .rpc('exec_sql', {
        query: `
          SELECT policyname, cmd, qual, with_check 
          FROM pg_policies 
          WHERE tablename = 'objects' AND schemaname = 'storage'
          ORDER BY policyname;
        `
      });

    if (policiesError) {
      console.log('⚠️ Не удалось проверить политики через RPC');
    } else {
      console.log('📋 Политики storage.objects:');
      if (policiesData && policiesData.length > 0) {
        policiesData.forEach(policy => {
          console.log(`   - ${policy.policyname} (${policy.cmd})`);
        });
      } else {
        console.log('   - Нет политик для storage.objects');
      }
    }

    // 4. Проверяем RLS
    console.log('\n4️⃣ Проверяем RLS для storage.objects...');
    const { data: rlsData, error: rlsError } = await supabase
      .rpc('exec_sql', {
        query: `
          SELECT schemaname, tablename, rowsecurity 
          FROM pg_tables 
          WHERE schemaname = 'storage' AND tablename = 'objects';
        `
      });

    if (rlsError) {
      console.log('⚠️ Не удалось проверить RLS через RPC');
    } else {
      console.log('🔒 RLS для storage.objects:');
      if (rlsData && rlsData.length > 0) {
        rlsData.forEach(table => {
          console.log(`   - ${table.schemaname}.${table.tablename} (rowsecurity: ${table.rowsecurity})`);
        });
      } else {
        console.log('   - Нет данных о RLS');
      }
    }

    // 5. Проверяем права пользователя
    console.log('\n5️⃣ Проверяем права пользователя...');
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.log('⚠️ Не удалось получить информацию о пользователе');
    } else {
      console.log('👤 Текущий пользователь:');
      if (userData.user) {
        console.log(`   - ID: ${userData.user.id}`);
        console.log(`   - Email: ${userData.user.email}`);
        console.log(`   - Role: ${userData.user.role || 'anon'}`);
      } else {
        console.log('   - Анонимный пользователь');
      }
    }

    console.log('\n🎉 Проверка завершена!');

  } catch (error) {
    console.error('❌ Ошибка проверки:', error);
  }
}

// Запускаем проверку
checkDatabaseStatus(); 