// ============================================
// ОЧИСТКА КЕША УВЕДОМЛЕНИЙ
// ============================================

// Этот скрипт можно запустить в консоли браузера или в приложении
// для очистки кеша уведомлений и тестирования

console.log('🧹 Очистка кеша уведомлений...');

// Очищаем кеш в notificationService
if (typeof window !== 'undefined' && window.sentNotifications) {
  window.sentNotifications.clear();
  console.log('✅ Кеш sentNotifications очищен');
}

// Очищаем кеш в playerStorage
if (typeof window !== 'undefined' && window.notificationCache) {
  window.notificationCache.clear();
  console.log('✅ Кеш notificationCache очищен');
}

if (typeof window !== 'undefined' && window.pushNotificationCache) {
  window.pushNotificationCache.clear();
  console.log('✅ Кеш pushNotificationCache очищен');
}

console.log('🎯 Кеш уведомлений очищен! Теперь можно тестировать уведомления.');

// Инструкции для тестирования
console.log(`
📋 ИНСТРУКЦИИ ДЛЯ ТЕСТИРОВАНИЯ:

1. Откройте приложение на Android устройстве
2. Откройте приложение на iOS устройстве (Expo Go)
3. Войдите под разными пользователями
4. Добавьте друг друга в друзья
5. Измените статистику одного пользователя
6. Проверьте, приходят ли уведомления на другое устройство

⚠️ ВАЖНО: В Expo Go push-уведомления могут не работать полностью.
Для полного тестирования используйте TestFlight или development build.
`);
