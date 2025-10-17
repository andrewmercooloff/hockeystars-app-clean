// Тест для проверки дублирования профилей
// Запустите: node test_duplicate_profiles.js

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jvsypfwiajuwsyuzkyda.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2c3lwZndpYWp1d3N5dXpreWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5OTczNTcsImV4cCI6MjA2OTU3MzM1N30.8d8k7HK7lFgIirdHzackMYRn6gGgD5OyqgOUq2rk2RM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDuplicateProfiles() {
  try {
    console.log('🔍 Проверяем дублирование профилей...\n');
    
    // Получаем всех пользователей
    const { data: users, error } = await supabase
      .from('players')
      .select('id, name, email, status, created_at')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Ошибка получения пользователей:', error);
      return;
    }
    
    console.log(`📋 Найдено пользователей: ${users.length}\n`);
    
    // Проверяем дублирование по email
    const emailCounts = {};
    const duplicateEmails = [];
    
    users.forEach(user => {
      if (user.email) {
        emailCounts[user.email] = (emailCounts[user.email] || 0) + 1;
        if (emailCounts[user.email] > 1) {
          duplicateEmails.push(user.email);
        }
      }
    });
    
    // Убираем дубликаты из массива
    const uniqueDuplicateEmails = [...new Set(duplicateEmails)];
    
    if (uniqueDuplicateEmails.length > 0) {
      console.log('⚠️ Обнаружены дублирующиеся email:');
      uniqueDuplicateEmails.forEach(email => {
        const duplicates = users.filter(user => user.email === email);
        console.log(`\n📧 Email: ${email}`);
        console.log(`   Количество дубликатов: ${duplicates.length}`);
        duplicates.forEach((user, index) => {
          console.log(`   ${index + 1}. ${user.name} (ID: ${user.id}) - ${user.status}`);
          console.log(`      Создан: ${user.created_at}`);
        });
      });
      
      console.log('\n🔧 Рекомендации:');
      console.log('1. Удалите дублирующиеся профили через Supabase Dashboard');
      console.log('2. Оставьте только один профиль для каждого email');
      console.log('3. Проверьте, что оставшийся профиль содержит все нужные данные');
      
    } else {
      console.log('✅ Дублирующихся email не найдено');
    }
    
    // Проверяем дублирование по имени (может быть случайным совпадением)
    const nameCounts = {};
    const duplicateNames = [];
    
    users.forEach(user => {
      if (user.name) {
        nameCounts[user.name] = (nameCounts[user.name] || 0) + 1;
        if (nameCounts[user.name] > 1) {
          duplicateNames.push(user.name);
        }
      }
    });
    
    const uniqueDuplicateNames = [...new Set(duplicateNames)];
    
    if (uniqueDuplicateNames.length > 0) {
      console.log('\n⚠️ Обнаружены пользователи с одинаковыми именами:');
      uniqueDuplicateNames.forEach(name => {
        const duplicates = users.filter(user => user.name === name);
        console.log(`\n👤 Имя: ${name}`);
        console.log(`   Количество: ${duplicates.length}`);
        duplicates.forEach((user, index) => {
          console.log(`   ${index + 1}. ${user.email} (ID: ${user.id}) - ${user.status}`);
          console.log(`      Создан: ${user.created_at}`);
        });
      });
    } else {
      console.log('\n✅ Пользователей с одинаковыми именами не найдено');
    }
    
    // Показываем всех пользователей
    console.log('\n📋 Полный список пользователей:');
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.email}) - ${user.status}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Создан: ${user.created_at}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Общая ошибка:', error);
  }
}

testDuplicateProfiles(); 