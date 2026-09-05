import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Updates from 'expo-updates';

const CHECK_COOLDOWN_MS = 5 * 60_000;
const INITIAL_DELAY_MS = 20_000;
const PENDING_UPDATE_KEY = 'hs_ota_pending_reload_v1';

/**
 * Downloads OTA updates in the background and applies them only when the user
 * leaves the app (background) — avoids a jarring mid-session reload.
 */
export function useOtaUpdates(): void {
  const checkingRef = useRef(false);
  const lastCheckRef = useRef(0);
  const pendingReloadRef = useRef(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    if (__DEV__ || Platform.OS === 'web' || !Updates.isEnabled) {
      return;
    }

    void AsyncStorage.getItem(PENDING_UPDATE_KEY).then((v) => {
      pendingReloadRef.current = v === '1';
    });

    const applyPendingReload = async () => {
      if (!pendingReloadRef.current) return;
      pendingReloadRef.current = false;
      await AsyncStorage.removeItem(PENDING_UPDATE_KEY);
      try {
        await Updates.reloadAsync();
      } catch {
        /* ignore */
      }
    };

    const checkAndDownload = async () => {
      const now = Date.now();
      if (checkingRef.current || now - lastCheckRef.current < CHECK_COOLDOWN_MS) {
        return;
      }
      checkingRef.current = true;
      lastCheckRef.current = now;
      try {
        const result = await Updates.checkForUpdateAsync();
        if (!result.isAvailable) return;
        await Updates.fetchUpdateAsync();
        pendingReloadRef.current = true;
        await AsyncStorage.setItem(PENDING_UPDATE_KEY, '1');
        // If already in background, reload immediately (user won't notice).
        if (appStateRef.current !== 'active') {
          await applyPendingReload();
        }
      } catch {
        /* OTA unavailable — ignore */
      } finally {
        checkingRef.current = false;
      }
    };

    const initialTimer = setTimeout(() => {
      void checkAndDownload();
    }, INITIAL_DELAY_MS);

    const subscription = AppState.addEventListener('change', (nextState) => {
      const wasActive = appStateRef.current === 'active';
      const goingBackground = nextState === 'background' || nextState === 'inactive';

      if (wasActive && goingBackground && pendingReloadRef.current) {
        void applyPendingReload();
      }

      if (
        (appStateRef.current === 'background' || appStateRef.current === 'inactive') &&
        nextState === 'active'
      ) {
        void checkAndDownload();
      }

      appStateRef.current = nextState;
    });

    return () => {
      clearTimeout(initialTimer);
      subscription.remove();
    };
  }, []);
}
