// Скрипт для тестирования настройки Resend API
// Запуск: node test_resend_setup.js

const SUPABASE_URL = 'https://jvsypfwiajuwsyuzkyda.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2c3lwZndpYWp1d3N5dXpreWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5OTczNTcsImV4cCI6MjA2OTU3MzM1N30.8d8k7HK7lFgIirdHzackMYRn6gGgD5OyqgOUq2rk2RM';

async function testResendSetup() {
  console.log('🧪 Тестируем настройку Resend API через Supabase Edge Function\n');

  const testEmail = 'test@example.com';
  const testCode = '123456';

  try {
    console.log('📧 Отправляем тестовый email...');
    console.log('📧 Email:', testEmail);
    console.log('🔑 Код:', testCode);
    console.log('🔗 URL:', `${SUPABASE_URL}/functions/v1/send-verification-email`);
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-verification-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: testEmail,
        code: testCode,
        subject: 'Test Email от HockeyStars'
      })
    });

    console.log('\n📊 Ответ сервера:');
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);

    const result = await response.json();
    console.log('Response:', JSON.stringify(result, null, 2));

    if (response.ok && result.success) {
      console.log('\n✅ УСПЕХ! Resend API настроен правильно');
      console.log('📧 Message ID:', result.data?.messageId);
      console.log('\n🎉 Теперь приложение будет отправлять реальные emails!');
    } else {
      console.log('\n❌ ОШИБКА! Проблема с настройкой:');
      console.log('Error:', result.error);
      
      if (result.error?.includes('RESEND_API_KEY')) {
        console.log('\n💡 Решение:');
        console.log('1. Зарегистрируйтесь на resend.com');
        console.log('2. Получите API ключ');
        console.log('3. Выполните: supabase secrets set RESEND_API_KEY=re_ваш_ключ');
        console.log('4. Переразверните функцию: supabase functions deploy send-verification-email');
      }
      
      if (result.error?.includes('Domain not verified')) {
        console.log('\n💡 Решение:');
        console.log('1. В панели Resend добавьте домен hockeystars.by');
        console.log('2. Настройте DNS записи в Cloudflare');
        console.log('3. Дождитесь верификации домена');
      }
    }

  } catch (error) {
    console.log('\n❌ КРИТИЧЕСКАЯ ОШИБКА:');
    console.log('Error:', error.message);
    
    if (error.message.includes('fetch')) {
      console.log('\n💡 Возможные причины:');
      console.log('1. Edge Function не развернута');
      console.log('2. Неправильный URL проекта');
      console.log('3. Проблемы с сетью');
      
      console.log('\n🔧 Проверьте:');
      console.log('1. supabase functions list');
      console.log('2. supabase functions deploy send-verification-email');
    }
  }
}

// Запуск теста
testResendSetup();
