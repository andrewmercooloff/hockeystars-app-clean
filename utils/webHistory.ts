import { Platform } from 'react-native';

/** Keep expo-router history.state when only the URL string must change. */
export function replaceBrowserUrl(path: string) {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  try {
    const next = path.startsWith('/') ? path : `/${path}`;
    const cur = window.location.pathname + window.location.search + window.location.hash;
    if (cur === next) return;
    const state = window.history.state;
    window.history.replaceState(state != null ? state : {}, '', next);
  } catch {
    // ignore
  }
}

/**
 * Open an in-app path with a real browser history entry.
 * Expo Tabs sibling screens often `navigate` without pushing history, so Back leaves the site.
 */
export function pushBrowserUrlThenReplace(
  router: { push: (href: any) => void; replace?: (href: any) => void },
  path: string
) {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    router.push(path as any);
    return;
  }
  const next = path.startsWith('/') ? path : `/${path}`;
  const cur = window.location.pathname + window.location.search + window.location.hash;
  if (cur === next) {
    router.replace?.(next as any) ?? router.push(next as any);
    return;
  }
  try {
    const state = window.history.state;
    window.history.pushState(state != null ? { ...state } : { hs: 1 }, '', next);
  } catch {
    router.push(next as any);
    return;
  }
  // Sync router UI without adding a second history row.
  if (router.replace) {
    router.replace(next as any);
  } else {
    router.push(next as any);
  }
}
