import { useCallback, useState } from 'react';
import { LayoutChangeEvent, useWindowDimensions } from 'react-native';
import { useIsDesktopLayout } from '../hooks/useIsDesktopLayout';

export const NOTIF_CARD_MARGIN = 16;
export const NOTIF_CARD_PADDING = 14;
/** Matches DesktopShell sidebar width */
export const DESKTOP_SIDEBAR_WIDTH = 248;
/** Comfortable max media width on wide web layouts */
export const NOTIF_MEDIA_MAX_WIDTH = 560;

export function estimateNotificationMediaWidth(
  windowWidth: number,
  isDesktop: boolean,
  opts?: { singleColumn?: boolean },
): number {
  const inset = NOTIF_CARD_MARGIN * 2 + NOTIF_CARD_PADDING * 2;
  if (isDesktop) {
    const center = Math.max(320, windowWidth - DESKTOP_SIDEBAR_WIDTH);
    const col = opts?.singleColumn ? center - 48 : (center - 16) / 2;
    return Math.max(180, Math.floor(Math.min(col - inset, NOTIF_MEDIA_MAX_WIDTH)));
  }
  return Math.max(180, Math.floor(windowWidth - inset));
}

/** Media slot width for feed cards: prefers measured container, falls back to viewport math. */
export function useNotificationMediaWidth(opts?: { singleColumn?: boolean }) {
  const { width: windowWidth } = useWindowDimensions();
  const isDesktop = useIsDesktopLayout();
  const [measured, setMeasured] = useState(0);

  const onMediaAreaLayout = useCallback((e: LayoutChangeEvent) => {
    const w = Math.floor(e.nativeEvent.layout.width);
    if (w > 0) {
      setMeasured((prev) => (prev === w ? prev : w));
    }
  }, []);

  const fallback = estimateNotificationMediaWidth(windowWidth, isDesktop, opts);
  const mediaWidth = measured > 0 ? measured : fallback;

  return { mediaWidth, onMediaAreaLayout, isDesktop };
}
