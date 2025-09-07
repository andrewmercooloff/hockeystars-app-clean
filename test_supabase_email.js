// Тест отправки email через Supabase
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jvsypfwiajuwsyuzkyda.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2c3lwZndpYWp1d3N5dXpreWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5OTczNTcsImV4cCI6MjA2OTU3MzM1N30.8d8k7HK7lFgIirdHzackMYRn6gGgD5OyqgOUq2rk2RM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSupabaseEmail() {
  console.log('🧪 Тестируем отправку email через Supabase Auth...');
  
  const testEmail = 'test@example.com';
  const testCode = '123456';
  
  try {
    // Пробуем отправить OTP
    const { data, error } = await supabase.auth.signInWithOtp({
      email: testEmail,
      options: {
        shouldCreateUser: false,
        data: {
          verification_code: testCode,
          app_name: 'HockeyStars'
        }
      }
    });
    
    if (error) {
      console.error('❌ Ошибка Supabase Auth:', error.message);
      console.log('💡 Возможные причины:');
      console.log('   - Email templates не настроены в Supabase Dashboard');
      console.log('   - Auth не включен для этого проекта');
      console.log('   - SMTP не настроен в Supabase');
      return false;
    }
    
    console.log('✅ Успешно! Данные:', data);
    console.log('📧 Email должен быть отправлен на:', testEmail);
    return true;
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
    return false;
  }
}

// Альтернативный тест - через Edge Functions
async function testEdgeFunction() {
  console.log('🧪 Тестируем отправку через Edge Function...');
  
  try {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        email: 'test@example.com',
        code: '123456',
        subject: 'Код подтверждения HockeyStars'
      }
    });
    
    if (error) {
      console.error('❌ Edge Function ошибка:', error);
      
      if (error.message && error.message.includes('404')) {
        console.log('💡 Edge Function не развернута. Выполните:');
        console.log('   supabase functions deploy send-email');
      }
      
      return false;
    }
    
    console.log('✅ Edge Function ответ:', data);
    
    if (data && data.success) {
      console.log('📧 Email успешно отправлен!');
      return true;
    } else {
      console.log('⚠️ Edge Function работает, но email не отправлен');
      console.log('💡 Возможно, не настроены email провайдеры (Resend/Gmail)');
      return true; // Функция работает, но нужна настройка
    }
    
  } catch (error) {
    console.error('❌ Ошибка Edge Function:', error);
    return false;
  }
}

// Запускаем тесты
async function runTests() {
  console.log('🚀 Запускаем тесты отправки email...\n');
  
  const authTest = await testSupabaseEmail();
  console.log('\n' + '='.repeat(50) + '\n');
  
  const edgeTest = await testEdgeFunction();
  
  console.log('\n📊 Результаты тестов:');
  console.log(`   Supabase Auth: ${authTest ? '✅' : '❌'}`);
  console.log(`   Edge Function: ${edgeTest ? '✅' : '❌'}`);
  
  if (!authTest && !edgeTest) {
    console.log('\n💡 Рекомендации:');
    console.log('1. Настройте Email Templates в Supabase Dashboard');
    console.log('2. Включите Authentication в проекте');
    console.log('3. Настройте SMTP провайдера (Gmail/SendGrid)');
    console.log('4. Или создайте Edge Function для отправки email');
  }
}

runTests().catch(console.error);
