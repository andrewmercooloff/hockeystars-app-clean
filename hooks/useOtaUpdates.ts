import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePathname } from 'expo-router';
import * as Updates from 'expo-updates';

const CHECK_COOLDOWN_MS = 5 * 60_000;
const FOREGROUND_POLL_MS = 30 * 60_000;
const INITIAL_DELAY_MS = 20_000;
const PENDING_UPDATE_KEY = 'hs_ota_pending_reload_v1';

const isAuthPath = (pathname: string | null): boolean =>
  pathname === '/login' ||
  pathname === '/register' ||
  pathname?.startsWith('/login') ||
  pathname?.startsWith('/register');

/** Apply a downloaded OTA bundle (e.g. before login when user kept app open for days). */
export async function applyOtaUpdateIfPending(): Promise<boolean> {
  if (__DEV__ || Platform.OS === 'web' || !Updates.isEnabled) {
    return false;
  }
  try {
    const pending = await AsyncStorage.getItem(PENDING_UPDATE_KEY);
    if (pending !== '1') {
      return false;
    }
    await AsyncStorage.removeItem(PENDING_UPDATE_KEY);
    await Updates.reloadAsync();
    return true;
  } catch {
    return false;
  }
}

/**
 * Downloads OTA updates in the background and applies them when safe:
 * - user leaves the app (background / inactive)
 * - user opens login or register (critical auth fixes)
 * - periodic poll while app stays in foreground (long-running sessions)
 */
export function useOtaUpdates(): void {
  const pathname = usePathname();
  const checkingRef = useRef(false);
  const lastCheckRef = useRef(0);
  const pendingReloadRef = useRef(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

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

        const canReloadNow =
          appStateRef.current !== 'active' || isAuthPath(pathnameRef.current);

        if (canReloadNow) {
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

    const pollTimer = setInterval(() => {
      if (appStateRef.current === 'active') {
        void checkAndDownload();
      }
    }, FOREGROUND_POLL_MS);

    const subscription = AppState.addEventListener('change', (nextState) => {
      const wasActive = appStateRef.current === 'active';
      const leavingActive =
        nextState === 'background' || nextState === 'inactive';

      if (wasActive && leavingActive && pendingReloadRef.current) {
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
      clearInterval(pollTimer);
      subscription.remove();
    };
  }, []);

  // Auth screens: apply a pending bundle as soon as user opens login/register.
  useEffect(() => {
    if (!isAuthPath(pathname)) return;
    void applyOtaUpdateIfPending();
  }, [pathname]);
}
