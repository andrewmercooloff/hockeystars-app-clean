import { Image } from 'expo-image';
import { rewriteSupabasePublicUrl } from './supabase';

const GIFT_THUMB_PX = 160;

export function giftImageDisplayUrl(url: string | null | undefined): string {
  return typeof url === 'string' ? url.trim() : '';
}

/** Small Supabase transform URL when supported; otherwise same as original. */
export function giftImageThumbUrl(url: string | null | undefined, size = GIFT_THUMB_PX): string {
  const full = rewriteSupabasePublicUrl(giftImageDisplayUrl(url)) || '';
  if (!full) return '';
  if (full.includes('/storage/v1/object/public/')) {
    return (
      full.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/') +
      `?width=${size}&height=${size}&resize=contain&quality=72`
    );
  }
  return full;
}

/** Prefetch originals (reliable) and optional thumbs for the gift picker. */
export async function prefetchGiftImages(urls: (string | null | undefined)[]): Promise<void> {
  const originals = [
    ...new Set(urls.map((u) => rewriteSupabasePublicUrl(giftImageDisplayUrl(u)) || '').filter(Boolean)),
  ];
  const thumbs = originals
    .map((original, index) => giftImageThumbUrl(original))
    .filter((thumb, index) => thumb && thumb !== originals[index]);
  const batch = [...new Set([...originals, ...thumbs])].slice(0, 32);
  if (batch.length === 0) return;
  await Promise.allSettled(
    batch.map((uri) => Image.prefetch(uri, { cachePolicy: 'memory-disk' })),
  );
}
