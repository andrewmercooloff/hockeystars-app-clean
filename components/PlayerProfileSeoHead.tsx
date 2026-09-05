import Head from 'expo-router/head';
import { useEffect, useMemo } from 'react';
import { Platform } from 'react-native';

import { useLanguage } from '../contexts/LanguageContext';
import type { Player } from '../utils/playerStorage';
import { PROFILE_NAV_KEYS, stashProfileNavParams } from '../utils/navigateToPlayer';
import { replaceBrowserUrl } from '../utils/webHistory';
import {
  buildPlayerHreflangUrls,
  buildPlayerPublicUrl,
  buildPlayerSeoDescription,
  buildPlayerSeoTitle,
  buildPlayerSlug,
  normalizeSeoLanguage,
  seoOgLocale,
} from '../utils/playerSeoPath';

type Props = {
  player: Player | null;
  playerId: string;
  /** Current club names from player_teams — overrides stale players.team in SEO. */
  currentTeamNames?: string[];
};

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  if (typeof document === 'undefined') return;
  const selector = `meta[${attr}="${key}"]`;
  let el = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(rel: string, href: string, hreflang?: string) {
  if (typeof document === 'undefined') return;
  const selector = hreflang
    ? `link[rel="${rel}"][hreflang="${hreflang}"]`
    : `link[rel="${rel}"]:not([hreflang])`;
  let el = document.head.querySelector(selector) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    if (hreflang) el.setAttribute('hreflang', hreflang);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

function setSingleDocumentTitle(title: string) {
  if (typeof document === 'undefined') return;
  const titles = Array.from(document.head.querySelectorAll('title'));
  let keeper: HTMLTitleElement | null = null;
  for (const el of titles) {
    const text = (el.textContent || '').trim();
    if (!keeper && text) {
      keeper = el;
    } else if (!keeper && !text) {
      keeper = el;
    } else {
      el.remove();
    }
  }
  if (!keeper) {
    keeper = document.createElement('title');
    document.head.insertBefore(keeper, document.head.firstChild);
  }
  for (const el of Array.from(document.head.querySelectorAll('title'))) {
    if (el !== keeper) el.remove();
  }
  keeper.textContent = title;
  if (document.title !== title) document.title = title;
}

function stashAndCleanPlayerUrl(path: string) {
  if (typeof window === 'undefined') return;
  try {
    const sp = new URLSearchParams(window.location.search);
    const fromUrl: Record<string, string> = {};
    for (const key of PROFILE_NAV_KEYS) {
      const v = sp.get(key);
      if (v) fromUrl[key] = v;
    }
    if (Object.keys(fromUrl).length) {
      stashProfileNavParams(fromUrl);
    }
    const next = path + window.location.hash;
    if (window.location.pathname + window.location.search + window.location.hash !== next) {
      // Preserve history.state — replaceState(null) breaks expo-router Back.
      replaceBrowserUrl(next);
    }
  } catch {
    // ignore
  }
}

/** Client-side SEO tags + localized Latin ЧПУ for web profiles. */
export default function PlayerProfileSeoHead({ player, playerId, currentTeamNames }: Props) {
  const { language } = useLanguage();
  const seoLang = normalizeSeoLanguage(language);

  const seoPlayer = useMemo(() => {
    if (!player) return null;
    const teams = (currentTeamNames || []).map((n) => String(n || '').trim()).filter(Boolean);
    return teams.length ? { ...player, currentTeams: teams } : player;
  }, [player, currentTeamNames]);

  const title = useMemo(
    () => (seoPlayer ? buildPlayerSeoTitle(seoPlayer, seoLang) : 'HockeyStars'),
    [seoPlayer, seoLang]
  );
  const description = useMemo(
    () => (seoPlayer ? buildPlayerSeoDescription(seoPlayer, seoLang) : ''),
    [seoPlayer, seoLang]
  );
  const canonical = useMemo(
    () =>
      seoPlayer
        ? buildPlayerPublicUrl(playerId, seoPlayer.name, seoLang)
        : buildPlayerPublicUrl(playerId, null, seoLang),
    [seoPlayer, playerId, seoLang]
  );

  useEffect(() => {
    if (Platform.OS !== 'web' || !seoPlayer || typeof document === 'undefined') return;

    const image = seoPlayer.avatar?.startsWith('http') ? seoPlayer.avatar : undefined;

    setSingleDocumentTitle(title);
    document.documentElement.lang = seoLang;
    upsertMeta('name', 'description', description);
    upsertLink('canonical', canonical);
    for (const { lang, href } of buildPlayerHreflangUrls(playerId, seoPlayer.name)) {
      upsertLink('alternate', href, lang);
    }
    upsertLink('alternate', buildPlayerPublicUrl(playerId, seoPlayer.name, 'ru'), 'x-default');

    upsertMeta('property', 'og:type', 'profile');
    upsertMeta('property', 'og:url', canonical);
    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:site_name', 'HockeyStars');
    upsertMeta('property', 'og:locale', seoOgLocale(seoLang));
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', title);
    upsertMeta('name', 'twitter:description', description);
    if (image) {
      upsertMeta('property', 'og:image', image);
      upsertMeta('name', 'twitter:image', image);
    }

    try {
      const path = `/${seoLang}/player/${buildPlayerSlug(playerId, seoPlayer.name)}`;
      stashAndCleanPlayerUrl(path);
    } catch {
      // ignore
    }
  }, [seoPlayer, playerId, seoLang, title, description, canonical]);

  if (Platform.OS !== 'web' || !seoPlayer) return null;

  return (
    <Head>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
    </Head>
  );
}
