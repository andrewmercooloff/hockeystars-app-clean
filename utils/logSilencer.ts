// Global log silencer
export const LOGS_ENABLED = false;

(function silenceLogs() {
  // Отключаем все логи кроме критических ошибок
  const silentNonError = true; // Отключаем все логи
  
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
        // Отключаем все логи
        return;
      }
      original(...args);
    };
  }
})();
