// Global log silencer
// В режиме разработки логи включены для отладки
// В production логи отключены, но можно включить через EXPO_PUBLIC_ENABLE_LOGS=true для TestFlight
export const LOGS_ENABLED = typeof __DEV__ !== 'undefined' ? __DEV__ : 
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_ENABLE_LOGS === 'true');

(function silenceLogs() {
  // В режиме разработки показываем все логи
  // В продакшене отключаем логи кроме критических ошибок
  // Можно включить логи в production через EXPO_PUBLIC_ENABLE_LOGS=true (для TestFlight диагностики)
  const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : false;
  const enableLogsInProd = typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_ENABLE_LOGS === 'true';
  const silentNonError = !isDev && !enableLogsInProd; // Отключаем логи в production, если не включены явно
  
  const methods: Array<'log'|'info'|'warn'|'error'|'debug'> = ['log','info','warn','debug','error'];
  for (const m of methods) {
    const original = (console as any)[m].bind(console);
    (console as any)[m] = (...args: any[]) => {
      if (m === 'error') {
        // Показываем только реальные ошибки (не те, что мы исправили)
        const message = args[0]?.toString() || '';
        // Игнорируем известные не критичные ошибки
        if (message.includes('splash screen') || message.includes('router.replace')) {
          return;
        }
        original(...args);
        return;
      }
      if (silentNonError) {
        // Отключаем все логи только в продакшене
        return;
      }
      original(...args);
    };
  }
})();
