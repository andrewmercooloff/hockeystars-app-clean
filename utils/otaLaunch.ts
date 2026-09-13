import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Updates from 'expo-updates';
import { clearOtaJustUpdated, peekOtaJustUpdated } from './otaReloadSignal';

const LAST_OTA_UPDATE_ID_KEY = 'hs_last_ota_update_id_v1';

export type OtaBootResult = {
  /** Skip the launch splash (silent OTA remount). */
  skipSplash: boolean;
  /** Show the short "лед залит" toast after boot. */
  showToast: boolean;
};

let bootPromise: Promise<OtaBootResult> | null = null;

/**
 * Resolve OTA boot state once per JS session.
 * Uses both the just-updated flag and bundle id change so toast/splash stay in sync
 * even if AsyncStorage writes race with reloadAsync().
 */
export function resolveOtaBoot(): Promise<OtaBootResult> {
  if (!bootPromise) {
    bootPromise = computeOtaBoot();
  }
  return bootPromise;
}

async function computeOtaBoot(): Promise<OtaBootResult> {
  if (__DEV__ || Platform.OS === 'web' || !Updates.isEnabled) {
    return { skipSplash: false, showToast: false };
  }
  try {
    const [justUpdatedFlag, previous] = await Promise.all([
      peekOtaJustUpdated(),
      AsyncStorage.getItem(LAST_OTA_UPDATE_ID_KEY),
    ]);
    const current = Updates.updateId ?? null;

    const bundleChanged = !!(current && previous && previous !== current);
    const firstBundle = !!(current && !previous);

    const skipSplash = bundleChanged;
    // Toast only from the explicit reload marker — bundleChanged alone caused repeats
    // when updateId persistence raced with reloadAsync().
    const showToast = justUpdatedFlag;

    if (current && (bundleChanged || firstBundle)) {
      await AsyncStorage.setItem(LAST_OTA_UPDATE_ID_KEY, current);
    }
    if (justUpdatedFlag) {
      await clearOtaJustUpdated();
    }

    return { skipSplash, showToast };
  } catch {
    return { skipSplash: false, showToast: false };
  }
}

/**
 * After a silent background OTA reload the JS tree remounts like a cold start.
 * Skip the launch splash when the bundle id changed since the last session.
 * @deprecated Prefer resolveOtaBoot() — kept for ota-production-guard marker.
 */
export async function shouldSkipSplashAfterOta(): Promise<boolean> {
  const boot = await resolveOtaBoot();
  return boot.skipSplash;
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
