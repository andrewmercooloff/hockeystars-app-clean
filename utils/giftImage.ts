import { Image } from 'expo-image';
import { rewriteSupabasePublicUrl } from './supabase';

const GIFT_THUMB_PX = 160;

/** Small Supabase transform URL for gift picker thumbnails (PNG gifts stay light). */
export function giftImageThumbUrl(url: string | null | undefined, size = GIFT_THUMB_PX): string {
  const full = rewriteSupabasePublicUrl(typeof url === 'string' ? url.trim() : '') || '';
  if (!full) return '';
  if (full.includes('/storage/v1/object/public/')) {
    return (
      full.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/') +
      `?width=${size}&height=${size}&resize=contain&quality=72`
    );
  }
  return full;
}

/** Warm expo-image disk cache for gift thumbnails. */
export async function prefetchGiftImages(urls: (string | null | undefined)[]): Promise<void> {
  const unique = [...new Set(urls.map((u) => giftImageThumbUrl(u)).filter(Boolean))];
  if (unique.length === 0) return;
  const batch = unique.slice(0, 24);
  await Promise.allSettled(
    batch.map((uri) => Image.prefetch(uri, { cachePolicy: 'memory-disk' })),
  );
}
