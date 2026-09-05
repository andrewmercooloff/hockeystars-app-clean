import { Asset } from 'expo-asset';
import { Image as ExpoImage } from 'expo-image';
import { Image as RNImage, Platform } from 'react-native';

/**
 * Web: lighter WebP (~68KB). Native: JPEG (universal decode).
 * Same ice look; web avoids downloading ~386KB JPG on every cold start.
 */
export const ICE_BACKGROUND =
  Platform.OS === 'web'
    ? require('../assets/images/led.webp')
    : require('../assets/images/led.jpg');

/** recyclingKey for expo-image — one decoded bitmap across screens. */
export const ICE_RECYCLING_KEY = 'hockeystars-ice-led-v3';

let warmPromise: Promise<void> | null = null;

/** Warm expo-image + expo-asset before first screen. */
export function warmIceBackground(): Promise<void> {
  if (!warmPromise) {
    warmPromise = (async () => {
      try {
        await Asset.fromModule(ICE_BACKGROUND).downloadAsync();
      } catch {
        /* ignore */
      }
      try {
        const resolved = RNImage.resolveAssetSource(ICE_BACKGROUND);
        if (resolved?.uri) {
          await ExpoImage.prefetch(resolved.uri);
        }
      } catch {
        /* ignore */
      }
    })();
  }
  return warmPromise;
}
