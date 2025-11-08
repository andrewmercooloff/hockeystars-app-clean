// Global log silencer
// ВРЕМЕННО ОТКЛЮЧЕНО ДЛЯ ОТЛАДКИ ПРОБЛЕМЫ С ЗАПИСЬЮ ЗВУКА
// В режиме разработки логи включены для отладки
export const LOGS_ENABLED = typeof __DEV__ !== 'undefined' ? __DEV__ : true;

(function silenceLogs() {
  // ВРЕМЕННО: Включаем все логи для отладки
  // В режиме разработки показываем все логи
  // В продакшене отключаем логи кроме критических ошибок
  const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : true;
  const silentNonError = false; // ВРЕМЕННО: всегда показываем логи для отладки (!isDev)
  
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
