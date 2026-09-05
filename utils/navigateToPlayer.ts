import { Platform } from 'react-native';

import {
  buildPlayerPath,
  normalizeSeoLanguage,
  type SeoLanguage,
} from './playerSeoPath';
import { pushBrowserUrlThenReplace } from './webHistory';

export const HS_PROFILE_NAV_KEY = 'hs_profile_nav';

/** Params kept out of the public profile URL (SEO) and stored in sessionStorage on web. */
export const PROFILE_NAV_KEYS = [
  'returnTo',
  'returnToPlayerId',
  'chatId',
  'refreshProfile',
  'refresh',
  'scrollToMuseum',
  'scrollToStats',
  'scrollToPhotos',
  'scrollToVideos',
  'scrollToAchievements',
  'scrollToExercises',
  'scrollToNormatives',
  'scrollToFriends',
  'scrollToGift',
  'scrollToSpeed',
  'scrollToAnalysis',
] as const;

export type ProfileNavKey = (typeof PROFILE_NAV_KEYS)[number];
export type ProfileNavParams = Partial<Record<ProfileNavKey, string>>;

type RouterLike = {
  push: (href: any) => void;
  replace?: (href: any) => void;
};

function pickNavParams(source: Record<string, unknown> | ProfileNavParams): ProfileNavParams {
  const out: ProfileNavParams = {};
  for (const key of PROFILE_NAV_KEYS) {
    const v = (source as Record<string, unknown>)[key];
    if (v != null && String(v) !== '') {
      out[key] = String(v);
    }
  }
  return out;
}

export function stashProfileNavParams(params: ProfileNavParams | Record<string, unknown>) {
  if (Platform.OS !== 'web' || typeof sessionStorage === 'undefined') return;
  const stash = pickNavParams(params);
  if (!Object.keys(stash).length) return;
  try {
    const prevRaw = sessionStorage.getItem(HS_PROFILE_NAV_KEY);
    const prev = prevRaw ? (JSON.parse(prevRaw) as Record<string, string>) : {};
    sessionStorage.setItem(HS_PROFILE_NAV_KEY, JSON.stringify({ ...prev, ...stash }));
  } catch {
    // ignore
  }
}

export function readProfileNavParams(): ProfileNavParams {
  if (Platform.OS !== 'web' || typeof sessionStorage === 'undefined') return {};
  try {
    const raw = sessionStorage.getItem(HS_PROFILE_NAV_KEY);
    if (!raw) return {};
    return pickNavParams(JSON.parse(raw) as Record<string, unknown>);
  } catch {
    return {};
  }
}

export function clearProfileNavParams(keys?: readonly string[]) {
  if (Platform.OS !== 'web' || typeof sessionStorage === 'undefined') return;
  try {
    if (!keys?.length) {
      sessionStorage.removeItem(HS_PROFILE_NAV_KEY);
      return;
    }
    const cur = readProfileNavParams() as Record<string, string>;
    for (const key of keys) delete cur[key];
    if (Object.keys(cur).length) {
      sessionStorage.setItem(HS_PROFILE_NAV_KEY, JSON.stringify(cur));
    } else {
      sessionStorage.removeItem(HS_PROFILE_NAV_KEY);
    }
  } catch {
    // ignore
  }
}

export type NavigateToPlayerOptions = {
  playerId: string;
  name?: string | null;
  lang?: string | SeoLanguage;
  replace?: boolean;
} & ProfileNavParams;

/**
 * Open a player profile on a clean SEO path on web (`/ru/player/slug`).
 * Nav params (returnTo, scrollTo*) go to sessionStorage on web; native keeps route params.
 */
export function navigateToPlayerProfile(router: RouterLike, opts: NavigateToPlayerOptions) {
  const { playerId, name, lang, replace, ...rest } = opts;
  const id = String(playerId || '').trim();
  if (!id) return;

  const navParams = pickNavParams(rest as Record<string, unknown>);
  const path = buildPlayerPath(id, name, normalizeSeoLanguage(lang || 'ru'));

  if (Platform.OS === 'web') {
    stashProfileNavParams(navParams);
    if (replace) {
      router.replace?.(path as any) ?? router.push(path as any);
      return;
    }
    // Force a browser history step — Tabs sibling routes often skip history.push.
    pushBrowserUrlThenReplace(router, path);
    return;
  }

  const go = replace && router.replace ? router.replace.bind(router) : router.push.bind(router);
  go({
    pathname: '/player/[id]',
    params: { id, ...navParams },
  });
}
