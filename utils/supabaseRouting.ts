import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';

export const SUPABASE_DIRECT_URL = 'https://jvsypfwiajuwsyuzkyda.supabase.co';
export const SUPABASE_PROXY_URL = 'https://api.hockey-stars.com';

export const SUPABASE_KNOWN_ORIGINS = [SUPABASE_DIRECT_URL, SUPABASE_PROXY_URL] as const;

const CACHE_KEY = 'supabase_preferred_origin_v3';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type CachedOrigin = { url: string; ts: number };

export type SupabaseRouteKind = 'direct' | 'proxy';

export function getSupabaseRouteKind(url: string): SupabaseRouteKind {
  return url.includes('api.hockey-stars.com') ? 'proxy' : 'direct';
}

/** Локаль/таймзона/язык как подсказка «вероятно РФ». */
export function isLikelyRussia(): boolean {
  try {
    for (const locale of Localization.getLocales()) {
      if (locale?.regionCode?.toUpperCase() === 'RU') return true;
      if (locale?.languageCode?.toLowerCase() === 'ru') return true;
    }
    const tz = Localization.getCalendars()[0]?.timeZone ?? '';
    if (/Moscow|Europe\/Moscow|Asia\/Yekaterinburg|Asia\/Novosibirsk|Asia\/Krasnoyarsk|Asia\/Irkutsk|Asia\/Yakutsk|Asia\/Vladivostok|Asia\/Magadan|Asia\/Kamchatka/.test(tz)) {
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}

export function guessInitialSupabaseOrigin(): string {
  // Безопасный старт: прокси работает и в РФ, и за рубежом; direct подключается после probe.
  return SUPABASE_PROXY_URL;
}

async function readCachedOrigin(): Promise<CachedOrigin | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedOrigin;
    if (!parsed?.url || !parsed.ts) return null;
    if (!SUPABASE_KNOWN_ORIGINS.includes(parsed.url as (typeof SUPABASE_KNOWN_ORIGINS)[number])) {
      return null;
    }
    if (Date.now() - parsed.ts > CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function writeCachedOrigin(url: string): Promise<void> {
  try {
    const payload: CachedOrigin = { url, ts: Date.now() };
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

/** Переключить кеш и активный маршрут на Moscow proxy (после сбоя direct). */
export async function preferSupabaseProxyOrigin(): Promise<void> {
  await writeCachedOrigin(SUPABASE_PROXY_URL);
}

export async function clearCachedSupabaseOrigin(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CACHE_KEY);
  } catch {
    // ignore
  }
}

export async function probeSupabaseOrigin(
  baseUrl: string,
  anonKey: string,
  timeoutMs: number,
): Promise<{ ok: boolean; ms: number }> {
  const t0 = Date.now();
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${baseUrl}/rest/v1/`, {
      method: 'GET',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      signal: controller.signal,
    });
    clearTimeout(tid);
    const ok = res.ok || res.status === 401 || res.status === 404;
    return { ok, ms: Date.now() - t0 };
  } catch {
    clearTimeout(tid);
    return { ok: false, ms: Date.now() - t0 };
  }
}

/**
 * Выбор маршрута:
 * - за пределами РФ: напрямую в Supabase (быстро, без лишнего hop);
 * - в РФ: всегда через Moscow VPS proxy (даже если probe direct «проходит»).
 */
function isHockeyStarsWebHost(): boolean {
  try {
    if (typeof window === 'undefined' || !window.location?.hostname) return false;
    return /(^|\.)hockey-stars\.com$/i.test(window.location.hostname);
  } catch {
    return false;
  }
}

export async function resolveSupabaseOrigin(anonKey: string): Promise<string> {
  // Web app already served from Moscow VPS — skip multi-second probes on cold start.
  if (isHockeyStarsWebHost()) {
    await writeCachedOrigin(SUPABASE_PROXY_URL);
    return SUPABASE_PROXY_URL;
  }

  const likelyRu = isLikelyRussia();
  const cached = await readCachedOrigin();

  if (cached?.url) {
    if (likelyRu && cached.url === SUPABASE_DIRECT_URL) {
      await writeCachedOrigin(SUPABASE_PROXY_URL);
      return SUPABASE_PROXY_URL;
    }
    if (!likelyRu && cached.url === SUPABASE_PROXY_URL) {
      const direct = await probeSupabaseOrigin(SUPABASE_DIRECT_URL, anonKey, 3000);
      if (direct.ok) {
        await writeCachedOrigin(SUPABASE_DIRECT_URL);
        return SUPABASE_DIRECT_URL;
      }
      return SUPABASE_PROXY_URL;
    }
    // Кеш direct после VPN: без повторной проверки в РФ получаем пустой экран.
    if (cached.url === SUPABASE_DIRECT_URL) {
      const direct = await probeSupabaseOrigin(SUPABASE_DIRECT_URL, anonKey, 3000);
      if (direct.ok) {
        return SUPABASE_DIRECT_URL;
      }
      await writeCachedOrigin(SUPABASE_PROXY_URL);
      return SUPABASE_PROXY_URL;
    }
    return cached.url;
  }

  if (likelyRu) {
    const proxy = await probeSupabaseOrigin(SUPABASE_PROXY_URL, anonKey, 8000);
    if (proxy.ok) {
      await writeCachedOrigin(SUPABASE_PROXY_URL);
      return SUPABASE_PROXY_URL;
    }
    await writeCachedOrigin(SUPABASE_PROXY_URL);
    return SUPABASE_PROXY_URL;
  }

  const direct = await probeSupabaseOrigin(SUPABASE_DIRECT_URL, anonKey, 4000);
  if (direct.ok) {
    await writeCachedOrigin(SUPABASE_DIRECT_URL);
    return SUPABASE_DIRECT_URL;
  }

  const proxy = await probeSupabaseOrigin(SUPABASE_PROXY_URL, anonKey, 4000);
  if (proxy.ok) {
    await writeCachedOrigin(SUPABASE_PROXY_URL);
    return SUPABASE_PROXY_URL;
  }

  await writeCachedOrigin(SUPABASE_DIRECT_URL);
  return SUPABASE_DIRECT_URL;
}

/** Фоновая проверка: смена страны / сети без перезапуска приложения. */
export async function revalidateSupabaseOriginInBackground(
  currentUrl: string,
  anonKey: string,
  onSwitch: (nextUrl: string) => void | Promise<void>,
  options?: { lockedUrl?: string },
): Promise<void> {
  if (options?.lockedUrl) {
    return;
  }

  const likelyRu = isLikelyRussia();

  if (likelyRu) {
    // Сидим на direct после аварийного failover — возвращаемся на proxy,
    // только когда он снова отвечает (иначе снова получим пустой экран).
    if (currentUrl !== SUPABASE_PROXY_URL) {
      const proxy = await probeSupabaseOrigin(SUPABASE_PROXY_URL, anonKey, 3000);
      if (proxy.ok) {
        await writeCachedOrigin(SUPABASE_PROXY_URL);
        await onSwitch(SUPABASE_PROXY_URL);
      }
    }
    return;
  }

  const direct = await probeSupabaseOrigin(SUPABASE_DIRECT_URL, anonKey, 3000);
  if (direct.ok && currentUrl !== SUPABASE_DIRECT_URL) {
    await writeCachedOrigin(SUPABASE_DIRECT_URL);
    await onSwitch(SUPABASE_DIRECT_URL);
    return;
  }

  // VPN выключили: direct перестал отвечать — откатываемся на proxy.
  if (!direct.ok && currentUrl === SUPABASE_DIRECT_URL) {
    const proxy = await probeSupabaseOrigin(SUPABASE_PROXY_URL, anonKey, 3000);
    if (proxy.ok) {
      await writeCachedOrigin(SUPABASE_PROXY_URL);
      await onSwitch(SUPABASE_PROXY_URL);
    }
  }
}
