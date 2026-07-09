import { Image, Platform } from 'react-native';
import { Dimensions } from 'react-native';
import type { SearchRatingShareEntry } from '../components/SearchRatingShareCard';

/** Ширина карточки = ширина экрана (1×), без OOM при captureRef. */
export const getRatingShareCardWidth = (): number =>
  Math.max(320, Math.round(Dimensions.get('window').width));

export async function prefetchRatingShareAvatars(entries: SearchRatingShareEntry[]): Promise<void> {
  const urls = new Set<string>();
  for (const { player } of entries) {
    const uri = player.avatar || (player.photos && player.photos.length > 0 ? player.photos[0] : null);
    if (uri?.startsWith('http')) urls.add(uri);
  }
  if (urls.size === 0) return;
  await Promise.allSettled(
    Array.from(urls).map((uri) =>
      Image.prefetch(uri).catch(() => {
        /* ignore — placeholder останется */
      })
    )
  );
  // Доп. пауза, чтобы RN Image успел декодировать на Android.
  await new Promise((r) => setTimeout(r, Platform.OS === 'android' ? 350 : 150));
}
