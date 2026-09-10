import { Image, Platform } from 'react-native';
import { Dimensions } from 'react-native';
import type { SearchRatingShareEntry } from '../components/SearchRatingShareCard';
import type { Player } from './playerStorage';

/** Ширина карточки = ширина экрана (1×), без OOM при captureRef. */
export const getRatingShareCardWidth = (): number =>
  Math.max(320, Math.round(Dimensions.get('window').width));

function collectPlayerAvatarUrls(players: Player[]): Set<string> {
  const urls = new Set<string>();
  for (const player of players) {
    const uri = player.avatar || (player.photos && player.photos.length > 0 ? player.photos[0] : null);
    if (uri?.startsWith('http')) urls.add(uri);
  }
  return urls;
}

async function prefetchAvatarUrls(urls: Set<string>): Promise<void> {
  if (urls.size === 0) return;
  await Promise.allSettled(
    Array.from(urls).map((uri) =>
      Image.prefetch(uri).catch(() => {
        /* ignore — placeholder останется */
      })
    )
  );
  await new Promise((r) => setTimeout(r, Platform.OS === 'android' ? 350 : 150));
}

export async function prefetchRatingShareAvatars(entries: SearchRatingShareEntry[]): Promise<void> {
  await prefetchAvatarUrls(collectPlayerAvatarUrls(entries.map((e) => e.player)));
}

export async function prefetchPlayersShareAvatars(players: Player[]): Promise<void> {
  await prefetchAvatarUrls(collectPlayerAvatarUrls(players));
}
