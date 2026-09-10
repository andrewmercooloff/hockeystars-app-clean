import { InteractionManager, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export type PickVideoOutcome =
  | { status: 'picked'; asset: ImagePicker.ImagePickerAsset }
  | { status: 'canceled' }
  | { status: 'permission_denied' }
  | { status: 'too_long'; maxSeconds: number }
  | { status: 'failed'; message: string };

const DEFAULT_MAX_SECONDS = 20;

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

/** Wait until RN modals/transitions finish so iOS can present PHPicker. */
function waitForPresentationReady(extraIosDelayMs = 150): Promise<void> {
  return new Promise((resolve) => {
    InteractionManager.runAfterInteractions(() => {
      if (Platform.OS === 'ios') {
        requestAnimationFrame(() => setTimeout(resolve, extraIosDelayMs));
      } else {
        resolve();
      }
    });
  });
}

async function ensureGalleryPermission(): Promise<boolean> {
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    return true;
  }
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return status === 'granted';
}

function isDurationTooLong(asset: ImagePicker.ImagePickerAsset, maxSeconds: number): boolean {
  const durationSec = asset.duration;
  return typeof durationSec === 'number' && durationSec > 0 && durationSec > maxSeconds;
}

/**
 * Opens the system video picker with iOS-safe deferral and a legacy-picker fallback.
 */
export async function pickVideoFromLibrary(maxSeconds = DEFAULT_MAX_SECONDS): Promise<PickVideoOutcome> {
  const granted = await ensureGalleryPermission();
  if (!granted) {
    return { status: 'permission_denied' };
  }

  await waitForPresentationReady();

  const tryLaunch = async (options: ImagePicker.ImagePickerOptions) => {
    const result = await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled || !result.assets?.[0]) {
      return { status: 'canceled' as const };
    }
    const asset = result.assets[0];
    if (isDurationTooLong(asset, maxSeconds)) {
      return { status: 'too_long' as const, maxSeconds };
    }
    return { status: 'picked' as const, asset };
  };

  try {
    // PHPicker (allowsEditing: false). videoMaxDuration applies only to legacy picker / camera.
    return await tryLaunch({
      mediaTypes: ['videos'],
      allowsEditing: false,
    });
  } catch (primaryError) {
    console.warn('Video picker (PHPicker) failed:', primaryError);

    if (Platform.OS !== 'ios') {
      return { status: 'failed', message: errorMessage(primaryError) };
    }

    await waitForPresentationReady(200);

    try {
      // Legacy UIImagePickerController — more reliable for video-only on some iOS builds.
      return await tryLaunch({
        mediaTypes: ['videos'],
        allowsEditing: true,
        videoMaxDuration: maxSeconds,
      });
    } catch (fallbackError) {
      console.error('Video picker (legacy) failed:', fallbackError);
      return { status: 'failed', message: errorMessage(fallbackError) };
    }
  }
}
