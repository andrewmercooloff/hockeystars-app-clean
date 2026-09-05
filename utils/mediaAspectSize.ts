import { useEffect, useState } from 'react';
import { Dimensions, Image } from 'react-native';

const FALLBACK_LANDSCAPE = 16 / 9;
const FALLBACK_PORTRAIT = 3 / 4;
const SCREEN_HEIGHT = Dimensions.get('window').height;

export type MediaBoxSize = { width: number; height: number; ready: boolean };

/** Высота слота = max(вписать в maxWidth), от 16:9 до cap. */
export function notificationSlotHeightFromSizes(
  maxWidth: number,
  sizes: Array<{ width: number; height: number } | null | undefined>,
  maxHeightCap?: number,
): number {
  const windowH = Dimensions.get('window').height || SCREEN_HEIGHT;
  const cap = maxHeightCap ?? Math.min(Math.round(maxWidth * 1.25), Math.round(windowH * 0.5), 480);
  let maxH = Math.round(maxWidth / FALLBACK_LANDSCAPE);
  for (const s of sizes) {
    if (!s || s.width <= 0 || s.height <= 0) continue;
    maxH = Math.max(maxH, Math.round(maxWidth * (s.height / s.width)));
  }
  return Math.min(maxH, cap);
}

/** Фиксированная высота слота, ширина пропорциональна; центрируется в pageWidth. */
export function fitInUniformSlot(
  naturalW: number,
  naturalH: number,
  maxWidth: number,
  slotHeight: number,
): { width: number; height: number } {
  if (naturalW <= 0 || naturalH <= 0) {
    return { width: maxWidth, height: slotHeight };
  }
  let width = Math.round(slotHeight * (naturalW / naturalH));
  let height = slotHeight;
  if (width > maxWidth) {
    width = maxWidth;
    height = Math.round(maxWidth * (naturalH / naturalW));
  }
  return { width, height };
}

/** Высота блока по реальным пропорциям медиа (без обрезки). */
export function boxFromAspect(maxWidth: number, naturalW: number, naturalH: number): { width: number; height: number } {
  if (naturalW <= 0 || naturalH <= 0) {
    return { width: maxWidth, height: Math.round(maxWidth / FALLBACK_LANDSCAPE) };
  }
  return { width: maxWidth, height: Math.round(maxWidth * (naturalH / naturalW)) };
}

export async function probeImageSize(uri: string): Promise<{ width: number; height: number } | null> {
  if (!uri?.trim()) return null;
  try {
    return await new Promise((resolve, reject) => {
      Image.getSize(uri, (width, height) => resolve({ width, height }), reject);
    });
  } catch {
    return null;
  }
}

/**
 * Размер кадра видео — только fallback 16:9.
 * expo-video-thumbnails на удалённых / YouTube URL давал нативные краши на iOS и Android.
 */
export async function probeVideoSize(_uri: string): Promise<{ width: number; height: number } | null> {
  return null;
}

export function useMediaAspectSize(
  uri: string | undefined,
  maxWidth: number,
  kind: 'image' | 'video'
): MediaBoxSize {
  const fallback = boxFromAspect(maxWidth, 16, 9);
  const [size, setSize] = useState(fallback);
  const [ready, setReady] = useState(kind === 'video');

  useEffect(() => {
    if (!uri || maxWidth <= 0) {
      setSize(fallback);
      setReady(kind === 'video');
      return;
    }

    if (kind === 'video') {
      setSize(fallback);
      setReady(true);
      return;
    }

    let cancelled = false;
    setReady(false);

    void (async () => {
      const natural = await probeImageSize(uri);
      if (cancelled) return;
      setSize(natural ? boxFromAspect(maxWidth, natural.width, natural.height) : fallback);
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [uri, maxWidth, kind]);

  return { ...size, ready };
}

/** Общая высота карусели уведомлений по списку URL (фото). */
export function useUniformCarouselHeight(
  uris: string[],
  maxWidth: number,
  fallbackAspect: number = FALLBACK_LANDSCAPE,
): number {
  const fallbackHeight = Math.round(maxWidth / fallbackAspect);
  const [slotHeight, setSlotHeight] = useState(fallbackHeight);

  useEffect(() => {
    if (!uris.length || maxWidth <= 0) {
      setSlotHeight(fallbackHeight);
      return;
    }

    let cancelled = false;
    void (async () => {
      const sizes = await Promise.all(uris.map((uri) => probeImageSize(uri)));
      if (cancelled) return;
      setSlotHeight(notificationSlotHeightFromSizes(maxWidth, sizes));
    })();

    return () => {
      cancelled = true;
    };
  }, [uris.join('|'), maxWidth, fallbackHeight]);

  return slotHeight;
}

export function uniformCarouselHeight(
  maxWidth: number,
  sizes: Array<{ width: number; height: number } | null | undefined>,
): number {
  return notificationSlotHeightFromSizes(maxWidth, sizes);
}

/** Высота карусели в уведомлениях (фото / превью видео). */
export function useNotificationCarouselSlotHeight(
  uris: string[],
  maxWidth: number,
  kind: 'image' | 'video',
  resolveProbeUri?: (uri: string) => string | null,
): number {
  const fallbackHeight = Math.round(maxWidth / FALLBACK_LANDSCAPE);
  const [slotHeight, setSlotHeight] = useState(fallbackHeight);

  useEffect(() => {
    if (!uris.length || maxWidth <= 0) {
      setSlotHeight(fallbackHeight);
      return;
    }

    let cancelled = false;
    void (async () => {
      const sizes = await Promise.all(
        uris.map(async (uri) => {
          const probeUri = resolveProbeUri?.(uri) ?? uri;
          const probed = await probeImageSize(probeUri);
          if (probed) return probed;
          return kind === 'video' ? { width: 16, height: 9 } : null;
        }),
      );
      if (cancelled) return;
      setSlotHeight(notificationSlotHeightFromSizes(maxWidth, sizes));
    })();

    return () => {
      cancelled = true;
    };
  }, [uris.join('|'), maxWidth, kind]);

  return slotHeight;
}
