import { Asset } from 'expo-asset';
import { Image as ExpoImage } from 'expo-image';
import { Image as RNImage } from 'react-native';

/** Единый фон «лёд» для всего приложения. */
export const ICE_BACKGROUND = require('../assets/images/led.jpg');

/** recyclingKey для expo-image — один декодированный bitmap на все экраны. */
export const ICE_RECYCLING_KEY = 'hockeystars-ice-led';

let warmPromise: Promise<void> | null = null;

/** Прогрев в expo-image + expo-asset до первого экрана. */
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
