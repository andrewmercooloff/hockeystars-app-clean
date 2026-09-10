/**
 * Даты рождения хранятся строками ("DD.MM.YYYY" в форме, "YYYY-MM-DD" в БД) и не должны
 * проходить через таймзоны: `new Date('2019-01-01')` — это полночь UTC, и в западных
 * поясах `getFullYear()` вернёт 2018. Здесь только календарная арифметика.
 */

export interface CalendarDate {
  day: number;
  month: number; // 1-12
  year: number;
}

export function parseBirthDate(value?: string | null): CalendarDate | null {
  if (!value) return null;
  const str = String(value).trim();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(str);
  if (m) return { year: +m[1], month: +m[2], day: +m[3] };
  m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(str);
  if (m) return { day: +m[1], month: +m[2], year: +m[3] };
  return null;
}

export function birthYearOf(value?: string | null): number | null {
  return parseBirthDate(value)?.year ?? null;
}

/** Локальная дата (полдень, чтобы DST не сдвинул день) для DateTimePicker. */
export function birthDateToLocalDate(value?: string | null, fallback: Date = new Date()): Date {
  const d = parseBirthDate(value);
  return d ? new Date(d.year, d.month - 1, d.day, 12, 0, 0, 0) : fallback;
}

/** "DD.MM.YYYY" из даты, выбранной в пикере (читаем локальные компоненты). */
export function formatPickerDate(date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}.${date.getFullYear()}`;
}
