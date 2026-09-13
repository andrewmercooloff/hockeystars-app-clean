import { Image } from 'expo-image';
import { rewriteSupabasePublicUrl } from './supabase';

/** 2× for 80px picker tiles — small on the wire, sharp on screen. */
const GIFT_THUMB_PX = 120;

export function giftImageDisplayUrl(url: string | null | undefined): string {
  return typeof url === 'string' ? url.trim() : '';
}

export function isPngGiftUrl(url: string | null | undefined): boolean {
  const full = (url ?? '').toLowerCase();
  if (!full) return false;
  return full.includes('.png') || full.includes('/gifts/');
}

/** Resized picker thumbnail; PNG keeps alpha via format=origin. */
export function giftImageThumbUrl(url: string | null | undefined, size = GIFT_THUMB_PX): string {
  const full = rewriteSupabasePublicUrl(giftImageDisplayUrl(url)) || '';
  if (!full) return '';
  if (!full.includes('/storage/v1/object/public/')) {
    return full;
  }

  const renderBase = full.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/');
  if (isPngGiftUrl(full)) {
    return `${renderBase}?width=${size}&height=${size}&resize=contain&format=origin`;
  }
  return `${renderBase}?width=${size}&height=${size}&resize=contain&quality=75`;
}

/** Prefetch small thumbs only (not full-size PNG originals). */
export async function prefetchGiftImages(urls: (string | null | undefined)[]): Promise<void> {
  const thumbs = [
    ...new Set(urls.map((u) => giftImageThumbUrl(u)).filter(Boolean)),
  ].slice(0, 32);
  if (thumbs.length === 0) return;
  await Promise.allSettled(
    thumbs.map((uri) => Image.prefetch(uri, { cachePolicy: 'memory-disk' })),
  );
}
