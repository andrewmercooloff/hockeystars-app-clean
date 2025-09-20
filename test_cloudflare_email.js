// Тест отправки email через Cloudflare Worker для hockeystars.by
const WORKER_URL = 'https://hockeystars-by-email.your-subdomain.workers.dev'; // Замените на ваш URL

async function testCloudflareWorker() {
  console.log('☁️ Тестируем отправку email через Cloudflare Worker...');
  console.log('🔗 URL:', WORKER_URL);
  
  const testEmail = 'test@example.com'; // Замените на ваш email для теста
  const testCode = '123456';
  
  try {
    console.log(`📧 Отправляем код ${testCode} на email: ${testEmail}`);
    
    const response = await fetch(WORKER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        email: testEmail,
        code: testCode,
        subject: 'Тест кода подтверждения HockeyStars'
      })
    });
    
    console.log('📡 Статус ответа:', response.status, response.statusText);
    
    const result = await response.json();
    console.log('📋 Ответ Worker:', result);
    
    if (response.ok && result.success) {
      console.log('✅ УСПЕХ! Email отправлен через Cloudflare Worker');
      console.log('📧 Message ID:', result.messageId);
      console.log('💌 Проверьте почтовый ящик (включая папку "Спам")');
      return true;
    } else {
      console.error('❌ ОШИБКА Worker:', result.error || result.message);
      
      if (response.status === 404) {
        console.log('💡 Worker не найден. Проверьте:');
        console.log('   1. Правильность URL');
        console.log('   2. Что Worker развернут в Cloudflare Dashboard');
      }
      
      return false;
    }
    
  } catch (error) {
    console.error('❌ Ошибка подключения:', error.message);
    
    if (WORKER_URL.includes('your-subdomain')) {
      console.log('💡 Обновите WORKER_URL в файле на реальный URL вашего Worker');
    }
    
    return false;
  }
}

// Тест валидации
async function testValidation() {
  console.log('\n🧪 Тестируем валидацию...');
  
  const tests = [
    { email: '', code: '123456', expected: 'error' },
    { email: 'invalid-email', code: '123456', expected: 'error' },
    { email: 'test@example.com', code: '12345', expected: 'error' },
    { email: 'test@example.com', code: 'abc123', expected: 'error' }
  ];
  
  for (const test of tests) {
    try {
      console.log(`📝 Тест: email="${test.email}", code="${test.code}"`);
      
      const response = await fetch(WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(test)
      });
      
      const result = await response.json();
      
      if (response.status >= 400 && result.error) {
        console.log(`✅ Валидация работает: ${result.error}`);
      } else {
        console.log(`⚠️ Ожидалась ошибка, но получен: ${JSON.stringify(result)}`);
      }
      
    } catch (error) {
      console.error(`❌ Ошибка теста валидации: ${error.message}`);
    }
  }
}

// Запуск всех тестов
async function runAllTests() {
  console.log('🚀 Запускаем тесты Cloudflare Worker для отправки email...\n');
  
  // Проверяем URL
  if (WORKER_URL.includes('your-subdomain')) {
    console.log('⚠️ ВНИМАНИЕ: Обновите WORKER_URL в файле на реальный URL вашего Worker!');
    console.log('📝 Получить URL можно в Cloudflare Dashboard → Workers & Pages → Ваш Worker\n');
  }
  
  // Основной тест
  const success = await testCloudflareWorker();
  
  // Тесты валидации (только если основной тест прошел)
  if (success) {
    await testValidation();
  }
  
  console.log('\n📊 Результаты тестов:');
  console.log(`   Cloudflare Worker: ${success ? '✅' : '❌'}`);
  
  if (success) {
    console.log('\n🎉 Отлично! Cloudflare Worker работает корректно!');
    console.log('📱 Теперь можете тестировать в приложении');
  } else {
    console.log('\n💡 Инструкции по настройке: CLOUDFLARE_EMAIL_SETUP.md');
  }
}

// Запускаем тесты
runAllTests().catch(console.error);
