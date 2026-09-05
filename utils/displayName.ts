/**
 * Имена в базе хранятся капсом (регистрация форсит UPPERCASE).
 * Для отображения переводим в обычный регистр: "DANIIL IVANOV" → "Daniil Ivanov".
 * Уже смешанный регистр не трогаем (например, "McDavid").
 */
export function displayName(name?: string | null): string {
  if (!name) return '';
  const s = String(name).trim();
  if (!s) return '';
  const isAllCaps = s === s.toUpperCase() && s !== s.toLowerCase();
  if (!isAllCaps) return s;
  return s
    .toLowerCase()
    .split(/(\s+|-)/)
    .map(part => (part.trim() && part !== '-' ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join('');
}

const NAME_KEY_RE = /(name)$/i;

/**
 * Проходит по объекту data уведомления и приводит все строковые поля,
 * заканчивающиеся на "Name", к обычному регистру.
 */
export function normalizeNamesInData<T extends Record<string, any> | undefined>(data: T): T {
  if (!data || typeof data !== 'object') return data;
  let changed = false;
  const out: Record<string, any> = { ...data };
  for (const key of Object.keys(out)) {
    const v = out[key];
    if (typeof v === 'string' && NAME_KEY_RE.test(key)) {
      const next = displayName(v);
      if (next !== v) {
        out[key] = next;
        changed = true;
      }
    }
  }
  return (changed ? out : data) as T;
}
