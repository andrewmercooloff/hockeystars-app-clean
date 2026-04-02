import * as Localization from 'expo-localization';

/** IANA timezone from the device (expo-localization), for server-side local scheduling. */
export function getDeviceIanaTimeZone(): string {
  try {
    const fn = (Localization as { getCalendars?: () => { timeZone?: string }[] }).getCalendars;
    if (typeof fn === 'function') {
      const cals = fn();
      if (Array.isArray(cals) && cals[0]?.timeZone) {
        return String(cals[0].timeZone);
      }
    }
  } catch {
    /* ignore */
  }
  return 'UTC';
}
