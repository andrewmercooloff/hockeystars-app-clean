import { usePathname } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

const METRIKA_ID = 105715227;

declare global {
  interface Window {
    ym?: (id: number, method: string, ...args: unknown[]) => void;
  }
}

/** SPA page views for Yandex.Metrika (web only). Counter script lives in app/+html.tsx. */
export default function WebYandexMetrika() {
  const pathname = usePathname();
  const lastHit = useRef<string | null>(null);
  const skipFirst = useRef(true);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const url = `${window.location.origin}${pathname || '/'}${window.location.search || ''}`;

    // First view is counted by ym(..., 'init', { url }).
    if (skipFirst.current) {
      skipFirst.current = false;
      lastHit.current = url;
      return;
    }

    if (lastHit.current === url) return;
    lastHit.current = url;

    const sendHit = () => {
      if (typeof window.ym === 'function') {
        window.ym(METRIKA_ID, 'hit', url, {
          title: document.title,
          referer: document.referrer,
        });
      }
    };

    sendHit();
    const t1 = setTimeout(sendHit, 800);
    const t2 = setTimeout(sendHit, 2500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [pathname]);

  return null;
}
