// country utilities (root) for auto-detection and mapping
export const detectCountryFromIP = async (): Promise<string | null> => {
  try {
    const resp = await fetch('https://ipapi.co/json/');
    if (resp.ok) {
      const data = await resp.json();
      const code = data?.country as string | undefined;
      if (code) {
        return code.toString().toUpperCase();
      }
    }
  } catch {
    // ignore network errors
  }
  return null;
};

export const countryCodeToCountryName = (code?: string | null): string | null => {
  if (!code) return null;
  const upper = code.toString().toUpperCase();
  const map: Record<string, string> = {
    BY: 'Беларусь',
    RU: 'Россия',
    UA: 'Украина',
    US: 'Соединённые Штаты',
    GB: 'Соединённое Королевство',
    DE: 'Германия',
    FR: 'Франция',
    BE: 'Бельгия',
    KZ: 'Казахстан',
    CN: 'Китай',
    IN: 'Индия',
    JP: 'Япония',
    BR: 'Бразилия',
    CA: 'Канада'
  };
  return map[upper] ?? upper;
};


