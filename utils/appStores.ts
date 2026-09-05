import { Linking, Platform } from 'react-native';

export const APP_STORE_ID = '6753738837';
export const GOOGLE_PLAY_PACKAGE = 'by.hockeystars.app';

export const APP_STORE_URL = `https://apps.apple.com/app/id${APP_STORE_ID}`;
export const GOOGLE_PLAY_URL = `https://play.google.com/store/apps/details?id=${GOOGLE_PLAY_PACKAGE}`;

/** Smart redirect used by desktop QR — phone UA picks the right store. */
export const GET_APP_URL = 'https://hockey-stars.com/get-app';

export type WebStorePlatform = 'ios' | 'android' | 'desktop';

export function detectWebStorePlatform(): WebStorePlatform {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined') {
    if (Platform.OS === 'ios') return 'ios';
    if (Platform.OS === 'android') return 'android';
    return 'desktop';
  }
  const ua = navigator.userAgent || '';
  if (/iPad|iPhone|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && (navigator as any).maxTouchPoints > 1)) {
    return 'ios';
  }
  if (/Android/i.test(ua)) return 'android';
  return 'desktop';
}

export function storeUrlForPlatform(platform: WebStorePlatform = detectWebStorePlatform()): string {
  if (platform === 'ios') return APP_STORE_URL;
  if (platform === 'android') return GOOGLE_PLAY_URL;
  return GET_APP_URL;
}

export async function openAppStore(platform?: WebStorePlatform) {
  const url = storeUrlForPlatform(platform ?? detectWebStorePlatform());
  try {
    await Linking.openURL(url);
  } catch {
    if (typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }
}
