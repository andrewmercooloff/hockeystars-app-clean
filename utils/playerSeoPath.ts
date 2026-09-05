/** Shared web SEO helpers: languages, home title, player paths. */

import { supabase } from './supabase';

/** Minimal player fields for SEO helpers — avoids importing playerStorage at startup. */
export type PlayerSeoFields = {
  name?: string | null;
  number?: string | number | null;
  birthDate?: string | null;
  age?: string | number | null;
  goals?: string | number | null;
  assists?: string | number | null;
  games?: string | number | null;
  country?: string | null;
  /** Legacy single team column — prefer currentTeams when present. */
  team?: string | null;
  /** Current club names from player_teams (is_primary). */
  currentTeams?: string[] | null;
  position?: string | null;
  status?: string | null;
};

/** All app languages that get localized web URLs (`/de/player/...`). */
export const SEO_LANGUAGES = [
  'ru',
  'en',
  'lt',
  'lv',
  'pl',
  'sv',
  'cs',
  'sk',
  'fi',
  'it',
  'de',
  'fr',
] as const;
export type SeoLanguage = (typeof SEO_LANGUAGES)[number];

export const SEO_LANG_PATH_RE = 'ru|en|lt|lv|pl|sv|cs|sk|fi|it|de|fr';

const HOME_TITLE: Record<SeoLanguage, string> = {
  ru: 'Хоккейное приложение Hockeystars',
  en: 'Hockey app Hockeystars',
  lt: 'Ledo ritulio programa Hockeystars',
  lv: 'Hokeja lietotne Hockeystars',
  pl: 'Aplikacja hokejowa Hockeystars',
  sv: 'Hockeyapp Hockeystars',
  cs: 'Hokejová aplikace Hockeystars',
  sk: 'Hokejová aplikácia Hockeystars',
  fi: 'Jääkiekkoappi Hockeystars',
  it: 'App di hockey Hockeystars',
  de: 'Hockey-App Hockeystars',
  fr: 'Application de hockey Hockeystars',
};

const STATS_LABEL: Record<SeoLanguage, string> = {
  ru: 'Статистика',
  en: 'Statistics',
  lt: 'Statistika',
  lv: 'Statistika',
  pl: 'Statystyki',
  sv: 'Statistik',
  cs: 'Statistika',
  sk: 'Štatistika',
  fi: 'Tilastot',
  it: 'Statistiche',
  de: 'Statistik',
  fr: 'Statistiques',
};

const OG_LOCALE: Record<SeoLanguage, string> = {
  ru: 'ru_RU',
  en: 'en_US',
  lt: 'lt_LT',
  lv: 'lv_LV',
  pl: 'pl_PL',
  sv: 'sv_SE',
  cs: 'cs_CZ',
  sk: 'sk_SK',
  fi: 'fi_FI',
  it: 'it_IT',
  de: 'de_DE',
  fr: 'fr_FR',
};

const CYR_TO_LAT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
  и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch',
  ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};

const UUID_RE =
  /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;

const slugResolveCache = new Map<string, string>();

export function cacheSlugResolve(slug: string, playerId: string): void {
  const key = decodeURIComponent(slug).trim().toLowerCase();
  if (key && playerId) {
    slugResolveCache.set(key, playerId);
  }
}

export function isSeoLanguage(lang?: string | null): lang is SeoLanguage {
  return !!lang && (SEO_LANGUAGES as readonly string[]).includes(lang);
}

export function normalizeSeoLanguage(lang?: string | null): SeoLanguage {
  const key = String(lang || '')
    .trim()
    .toLowerCase()
    .slice(0, 2);
  return isSeoLanguage(key) ? key : 'ru';
}

export function buildHomeSeoTitle(lang: SeoLanguage = 'ru'): string {
  return HOME_TITLE[lang] || HOME_TITLE.ru;
}

export function seoOgLocale(lang: SeoLanguage): string {
  return OG_LOCALE[lang] || 'ru_RU';
}

export function slugifyLatin(input: string): string {
  const lower = (input || '').trim().toLowerCase();
  let out = '';
  for (const ch of lower) {
    if (CYR_TO_LAT[ch] !== undefined) {
      out += CYR_TO_LAT[ch];
    } else if (/[a-z0-9]/.test(ch)) {
      out += ch;
    } else if (/[\s_./\\—–-]+/.test(ch)) {
      out += '-';
    }
  }
  return out
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'player';
}

/** `/ru/player/ivan-merkulov` */
export function buildPlayerPath(
  playerId: string,
  name?: string | null,
  lang: SeoLanguage = 'ru'
): string {
  const id = String(playerId || '').trim();
  if (!id) return '/';
  const slug = slugifyLatin(name || '');
  const segment = slug && slug !== 'player' ? slug : id;
  return `/${normalizeSeoLanguage(lang)}/player/${segment}`;
}

export function buildPlayerSlug(playerId: string, name?: string | null): string {
  const id = String(playerId || '').trim();
  const slug = slugifyLatin(name || '');
  if (slug && slug !== 'player') return slug;
  return id;
}

export function buildPlayerPublicUrl(
  playerId: string,
  name?: string | null,
  lang: SeoLanguage = 'ru'
): string {
  return `https://hockey-stars.com${buildPlayerPath(playerId, name, lang)}`;
}

export function extractLangFromPathname(pathname: string): SeoLanguage | null {
  const m = pathname.match(new RegExp(`^/(${SEO_LANG_PATH_RE})/player/`, 'i'));
  return m ? normalizeSeoLanguage(m[1]) : null;
}

export function extractPlayerIdFromParam(param: string | string[] | undefined): string | null {
  const raw = Array.isArray(param) ? param[0] : param;
  if (!raw || typeof raw !== 'string') return null;
  const decoded = decodeURIComponent(raw).trim();
  const match = decoded.match(UUID_RE);
  if (match) return match[0].toLowerCase();
  if (/^[0-9a-f-]{36}$/i.test(decoded)) return decoded.toLowerCase();
  return null;
}

export async function resolvePlayerIdFromRouteParam(param: string): Promise<string | null> {
  const direct = extractPlayerIdFromParam(param);
  if (direct) return direct;

  const slug = decodeURIComponent(param).trim().toLowerCase();
  if (!slug || slug === 'player') return null;

  const cached = slugResolveCache.get(slug);
  if (cached) return cached;

  const hint = slug.split('-').filter(Boolean)[0] || slug;
  const { data, error } = await supabase
    .from('players')
    .select('id,name')
    .ilike('name', `%${hint}%`)
    .limit(40);

  if (error || !data?.length) return null;

  const matches = data.filter((row) => slugifyLatin(String(row.name || '')) === slug);
  const pick = matches.length === 1 ? matches[0] : matches[0];
  if (!pick?.id) return null;

  slugResolveCache.set(slug, pick.id);
  return pick.id;
}

function extractBirthYear(player: Pick<PlayerSeoFields, 'birthDate' | 'age'>): string | null {
  const bd = player.birthDate?.trim();
  if (bd) {
    const m = bd.match(/(\d{4})/);
    if (m) return m[1];
  }
  return null;
}

function seasonStats(player: Pick<PlayerSeoFields, 'goals' | 'assists' | 'games'>) {
  const goals = parseInt(String(player.goals ?? '0'), 10) || 0;
  const assists = parseInt(String(player.assists ?? '0'), 10) || 0;
  const points = goals + assists;
  const games = parseInt(String(player.games ?? '0'), 10) || 0;
  const ppg = games > 0 ? points / games : null;
  return { points, games, ppg };
}

const ROLE_LABEL: Record<string, Record<string, string>> = {
  ru: {
    player: 'хоккеист',
    coach: 'тренер',
    star: 'звезда',
    scout: 'скаут',
    shop: 'магазин',
    default: 'профиль',
  },
  en: {
    player: 'hockey player',
    coach: 'coach',
    star: 'star',
    scout: 'scout',
    shop: 'shop',
    default: 'profile',
  },
  de: {
    player: 'Eishockeyspieler',
    coach: 'Trainer',
    star: 'Star',
    scout: 'Scout',
    shop: 'Shop',
    default: 'Profil',
  },
  fr: {
    player: 'joueur de hockey',
    coach: 'entraîneur',
    star: 'star',
    scout: 'scout',
    shop: 'boutique',
    default: 'profil',
  },
  it: {
    player: 'giocatore di hockey',
    coach: 'allenatore',
    star: 'star',
    scout: 'scout',
    shop: 'negozio',
    default: 'profilo',
  },
  pl: {
    player: 'hokeista',
    coach: 'trener',
    star: 'gwiazda',
    scout: 'skaut',
    shop: 'sklep',
    default: 'profil',
  },
  cs: {
    player: 'hokejista',
    coach: 'trenér',
    star: 'hvězda',
    scout: 'skaut',
    shop: 'obchod',
    default: 'profil',
  },
  sk: {
    player: 'hokejista',
    coach: 'tréner',
    star: 'hviezda',
    scout: 'skaut',
    shop: 'obchod',
    default: 'profil',
  },
  sv: {
    player: 'hockeyspelare',
    coach: 'tränare',
    star: 'stjärna',
    scout: 'scout',
    shop: 'butik',
    default: 'profil',
  },
  fi: {
    player: 'jääkiekkoilija',
    coach: 'valmentaja',
    star: 'tähti',
    scout: 'scout',
    shop: 'kauppa',
    default: 'profiili',
  },
  lt: {
    player: 'ledo ritulininkas',
    coach: 'treneris',
    star: 'žvaigždė',
    scout: 'skautas',
    shop: 'parduotuvė',
    default: 'profilis',
  },
  lv: {
    player: 'hokejists',
    coach: 'treneris',
    star: 'zvaigzne',
    scout: 'skauts',
    shop: 'veikals',
    default: 'profils',
  },
};

function roleWord(status: string | undefined, lang: SeoLanguage): string {
  const key = (status || 'player').toLowerCase();
  const table = ROLE_LABEL[lang] || ROLE_LABEL.en;
  return table[key] || table.default;
}

const POSITION_LABEL: Record<string, Record<string, string>> = {
  ru: {
    center: 'Центральный нападающий',
    winger: 'Крайний нападающий',
    defender: 'Защитник',
    goalie: 'Вратарь',
    goalkeeper: 'Вратарь',
  },
  en: {
    center: 'Center',
    winger: 'Winger',
    defender: 'Defender',
    goalie: 'Goalie',
    goalkeeper: 'Goalie',
  },
  lt: {
    center: 'Centro puolėjas',
    winger: 'Krašto puolėjas',
    defender: 'Gynėjas',
    goalie: 'Vartininkas',
    goalkeeper: 'Vartininkas',
  },
  lv: {
    center: 'Centra uzbrucējs',
    winger: 'Malējais uzbrucējs',
    defender: 'Aizstāvis',
    goalie: 'Vārtsargs',
    goalkeeper: 'Vārtsargs',
  },
  pl: {
    center: 'Środkowy napastnik',
    winger: 'Skrzydłowy',
    defender: 'Obrońca',
    goalie: 'Bramkarz',
    goalkeeper: 'Bramkarz',
  },
  sv: {
    center: 'Center',
    winger: 'Ytter',
    defender: 'Försvarare',
    goalie: 'Målvakt',
    goalkeeper: 'Målvakt',
  },
  cs: {
    center: 'Střední útočník',
    winger: 'Křídelník',
    defender: 'Obránce',
    goalie: 'Brankář',
    goalkeeper: 'Brankář',
  },
  sk: {
    center: 'Stredný útočník',
    winger: 'Krídelník',
    defender: 'Obranca',
    goalie: 'Brankár',
    goalkeeper: 'Brankár',
  },
  fi: {
    center: 'Keskushyökkääjä',
    winger: 'Laituri',
    defender: 'Puolustaja',
    goalie: 'Maalivahti',
    goalkeeper: 'Maalivahti',
  },
  it: {
    center: 'Centravanti',
    winger: 'Ala',
    defender: 'Difensore',
    goalie: 'Portiere',
    goalkeeper: 'Portiere',
  },
  de: {
    center: 'Mittelstürmer',
    winger: 'Flügelspieler',
    defender: 'Verteidiger',
    goalie: 'Torwart',
    goalkeeper: 'Torwart',
  },
  fr: {
    center: 'Centre',
    winger: 'Ailier',
    defender: 'Défenseur',
    goalie: 'Gardien',
    goalkeeper: 'Gardien',
  },
};

/** Localize DB position keys (center) and pass through already-localized labels. */
export function localizePlayerPosition(
  position: string | null | undefined,
  lang: SeoLanguage = 'ru'
): string | null {
  const raw = position?.trim();
  if (!raw) return null;
  const key = raw.toLowerCase();
  const table = POSITION_LABEL[lang] || POSITION_LABEL.en;
  const ruTable = POSITION_LABEL.ru;
  // If raw is a Russian label, map via English key when possible
  for (const [enKey, ruLabel] of Object.entries(ruTable)) {
    if (ruLabel.toLowerCase() === key) {
      return table[enKey] || raw;
    }
  }
  return table[key] || raw;
}

/**
 * All current team names for SEO (comma-separated), same as profile header.
 * Do not fall back to legacy players.team — stale duplicates (e.g. "Привет").
 */
export function resolveSeoTeamName(player: PlayerSeoFields, lang: SeoLanguage = 'ru'): string | null {
  const fromCurrent = (player.currentTeams || [])
    .map((n) => String(n || '').trim())
    .filter(Boolean);
  if (!fromCurrent.length) return null;
  return fromCurrent.join(', ');
}

/** Title: IVAN MERKULOV #4 - хоккеист, Центральный нападающий, SKA-Strelna 2012, Россия. Статистика - Hockeystars */
export function buildPlayerSeoTitle(player: PlayerSeoFields, lang: SeoLanguage = 'ru'): string {
  const seoLang = normalizeSeoLanguage(lang);
  const rawName = player.name?.trim() || 'HockeyStars';
  const name = rawName.toUpperCase();
  const num = String(player.number ?? '').trim();
  const namePart = num ? `${name} #${num}` : name;

  const bits: string[] = [roleWord(player.status ?? undefined, seoLang)];
  const position = localizePlayerPosition(player.position, seoLang);
  if (position) bits.push(position);

  const team = resolveSeoTeamName(player, seoLang);
  const birthYear = extractBirthYear(player);
  if (team && birthYear) bits.push(`${team} ${birthYear}`);
  else if (team) bits.push(team);
  else if (birthYear) bits.push(birthYear);

  if (player.country?.trim()) bits.push(player.country.trim());

  const statsLabel = STATS_LABEL[seoLang] || STATS_LABEL.en;
  return `${namePart} - ${bits.join(', ')}. ${statsLabel} - Hockeystars`;
}

/** Prose description for meta / OG */
export function buildPlayerSeoDescription(player: PlayerSeoFields, lang: SeoLanguage = 'ru'): string {
  const seoLang = normalizeSeoLanguage(lang);
  const name = player.name?.trim() || 'HockeyStars';
  const role = roleWord(player.status ?? undefined, seoLang);
  const team = resolveSeoTeamName(player, seoLang);
  const country = player.country?.trim();
  const position = localizePlayerPosition(player.position, seoLang);
  const { points, games } = seasonStats(player);

  if (seoLang === 'ru') {
    let text = `${name} — ${role}`;
    if (team) text += ` ${team}`;
    if (country) text += ` из ${country}`;
    if (position) text += `, ${position.toLowerCase()}`;
    text += '. Смотри статистику игрока, перспективы и скаутский отчёт в HockeyStars.';
    if (points > 0 && games > 0) {
      text += ` Сезон: ${points} очков в ${games} играх.`;
    }
    return text;
  }

  let text = `${name} — ${role}`;
  if (team) text += ` of ${team}`;
  if (country) text += ` from ${country}`;
  if (position) text += `, ${position.toLowerCase()}`;
  text += '. View player stats, prospects and scout report on HockeyStars.';
  if (points > 0 && games > 0) {
    text += ` Season: ${points} points in ${games} games.`;
  }
  return text;
}

export function buildPlayerHreflangUrls(playerId: string, name?: string | null) {
  return SEO_LANGUAGES.map((lang) => ({
    lang,
    href: buildPlayerPublicUrl(playerId, name, lang),
  }));
}
