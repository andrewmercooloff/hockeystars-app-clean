// Простой тест для проверки push-уведомлений
const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3000/api';

async function testPushNotifications() {
  console.log('🧪 Тестирование push-уведомлений...\n');

  try {
    // 1. Проверяем health endpoint
    console.log('1. Проверка сервера...');
    const healthResponse = await fetch(`${API_BASE}/health`);
    const health = await healthResponse.json();
    console.log('✅ Сервер работает:', health.status);

    // 2. Получаем список пользователей (нужен реальный userId)
    console.log('\n2. Для тестирования нужен реальный userId из базы данных');
    console.log('   Выполните SQL запрос: SELECT id FROM players LIMIT 1;');
    
    // 3. Пример тестового уведомления (замените USER_ID на реальный)
    const testUserId = 'YOUR_USER_ID_HERE';
    
    if (testUserId !== 'YOUR_USER_ID_HERE') {
      console.log(`\n3. Отправка тестового уведомления пользователю ${testUserId}...`);
      
      const notificationResponse = await fetch(`${API_BASE}/push-notifications/test/${testUserId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: '🧪 Тестовое уведомление',
          body: 'Push-уведомления работают! Это тест от HockeyStars.'
        })
      });

      const result = await notificationResponse.json();
      console.log('✅ Результат:', result);
    } else {
      console.log('\n3. ⚠️  Замените YOUR_USER_ID_HERE на реальный ID пользователя');
    }

    console.log('\n🎉 Тест завершен!');
    console.log('\n📱 Для полного тестирования:');
    console.log('   1. Откройте приложение на телефоне');
    console.log('   2. Войдите в аккаунт');
    console.log('   3. Разрешите уведомления');
    console.log('   4. Запустите этот тест с реальным userId');

  } catch (error) {
    console.error('❌ Ошибка тестирования:', error.message);
  }
}

// Запуск теста
testPushNotifications();











