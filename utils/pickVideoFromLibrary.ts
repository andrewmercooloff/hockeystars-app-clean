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

/** Wait until RN modals/transitions finish so iOS can present the picker. */
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

/** expo-image-picker returns duration in milliseconds. */
function isDurationTooLong(asset: ImagePicker.ImagePickerAsset, maxSeconds: number): boolean {
  const durationMs = asset.duration;
  if (typeof durationMs !== 'number' || durationMs <= 0) {
    return false;
  }
  return durationMs > maxSeconds * 1000;
}

/**
 * Opens the system video picker once (no second gallery fallback).
 * iOS uses legacy UIImagePickerController — PHPicker often fails on video export.
 */
export async function pickVideoFromLibrary(maxSeconds = DEFAULT_MAX_SECONDS): Promise<PickVideoOutcome> {
  const granted = await ensureGalleryPermission();
  if (!granted) {
    return { status: 'permission_denied' };
  }

  await waitForPresentationReady();

  const options: ImagePicker.ImagePickerOptions =
    Platform.OS === 'ios'
      ? {
          mediaTypes: ['videos'],
          allowsEditing: true,
          videoMaxDuration: maxSeconds,
        }
      : {
          mediaTypes: ['videos'],
          allowsEditing: false,
        };

  try {
    const result = await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled || !result.assets?.[0]) {
      return { status: 'canceled' };
    }

    const asset = result.assets[0];
    // iOS enforces videoMaxDuration in the native trim UI; Android PHPicker needs a JS check.
    if (Platform.OS === 'android' && isDurationTooLong(asset, maxSeconds)) {
      return { status: 'too_long', maxSeconds };
    }

    return { status: 'picked', asset };
  } catch (error) {
    console.error('Video picker failed:', error);
    return { status: 'failed', message: errorMessage(error) };
  }
}
