// Global log silencer
export const LOGS_ENABLED = false;

(function silenceLogs() {
  // In development (__DEV__ is true), keep logs for debugging.
  const isDev = (typeof (globalThis as any).__DEV__ !== 'undefined') ? (globalThis as any).__DEV__ : LOGS_ENABLED;
  // Silence non-error logs in production; keep errors visible
  const silentNonError = !isDev;
  const methods: Array<'log'|'info'|'warn'|'error'|'debug'> = ['log','info','warn','debug','error'];
  for (const m of methods) {
    const original = (console as any)[m].bind(console);
    (console as any)[m] = (...args: any[]) => {
      if (m === 'error') {
        // Always show errors to aid troubleshooting
        original(...args);
        return;
      }
      if (silentNonError) {
        // production: silence non-error logs
        return;
      }
      original(...args);
    };
  }
})();
