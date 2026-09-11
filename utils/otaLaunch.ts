import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Updates from 'expo-updates';

const LAST_OTA_UPDATE_ID_KEY = 'hs_last_ota_update_id_v1';

/**
 * After a silent background OTA reload the JS tree remounts like a cold start.
 * Skip the launch splash when the bundle id changed since the last session.
 */
export async function shouldSkipSplashAfterOta(): Promise<boolean> {
  if (__DEV__ || Platform.OS === 'web' || !Updates.isEnabled) {
    return false;
  }
  try {
    const current = Updates.updateId ?? null;
    if (!current) return false;

    const previous = await AsyncStorage.getItem(LAST_OTA_UPDATE_ID_KEY);
    if (!previous) {
      await AsyncStorage.setItem(LAST_OTA_UPDATE_ID_KEY, current);
      return false;
    }

    if (previous !== current) {
      await AsyncStorage.setItem(LAST_OTA_UPDATE_ID_KEY, current);
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/** Persist the running bundle id after a normal launch (splash finished). */
export async function persistOtaUpdateId(): Promise<void> {
  if (__DEV__ || Platform.OS === 'web' || !Updates.isEnabled) return;
  try {
    const current = Updates.updateId ?? null;
    if (current) {
      await AsyncStorage.setItem(LAST_OTA_UPDATE_ID_KEY, current);
    }
  } catch {
    /* ignore */
  }
}
