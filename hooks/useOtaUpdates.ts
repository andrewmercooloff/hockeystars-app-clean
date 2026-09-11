import { useEffect, useRef } from 'react';
import { AppState, InteractionManager, type AppStateStatus, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePathname } from 'expo-router';
import * as Updates from 'expo-updates';
import { markOtaJustUpdated, presentOtaReload } from '../utils/otaReloadSignal';

const CHECK_COOLDOWN_MS = 5 * 60_000;
const FOREGROUND_POLL_MS = 15 * 60_000;
const INITIAL_DELAY_MS = 3_000;
const FOREGROUND_RELOAD_DELAY_MS = 1_200;
const PENDING_UPDATE_KEY = 'hs_ota_pending_reload_v1';

const isAuthPath = (pathname: string | null): boolean =>
  !!pathname && (pathname.startsWith('/login') || pathname.startsWith('/register'));

async function markPendingReload(pending: boolean): Promise<void> {
  try {
    if (pending) {
      await AsyncStorage.setItem(PENDING_UPDATE_KEY, '1');
    } else {
      await AsyncStorage.removeItem(PENDING_UPDATE_KEY);
    }
  } catch {
    /* ignore */
  }
}

/**
 * Reload into the downloaded bundle. Visible reloads show the ice-resurfacing overlay
 * and a post-reload toast. Background reloads must stay silent — no AsyncStorage writes
 * before reloadAsync or iOS may suspend the app before the bundle switches.
 */
async function reloadWithResurfacing(visible: boolean): Promise<void> {
  if (visible) {
    await markOtaJustUpdated();
    await presentOtaReload();
  }
  await Updates.reloadAsync();
}

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
    await reloadWithResurfacing(true);
    await markPendingReload(false);
    return true;
  } catch {
    await markPendingReload(true);
    return false;
  }
}

/**
 * Downloads OTA updates in the background and applies them when safe:
 * - user leaves the app (background / inactive)
 * - user opens login or register (critical auth fixes)
 * - periodic poll while app stays in foreground (long-running sessions)
 * - retry on next foreground if a background reload did not stick
 */
export function useOtaUpdates(): void {
  const pathname = usePathname();
  const checkingRef = useRef(false);
  const lastCheckRef = useRef(0);
  const pendingReloadRef = useRef(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const pathnameRef = useRef(pathname);
  const foregroundReloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

    const clearForegroundReloadTimer = () => {
      if (foregroundReloadTimerRef.current) {
        clearTimeout(foregroundReloadTimerRef.current);
        foregroundReloadTimerRef.current = null;
      }
    };

    const applyPendingReload = async (visible: boolean) => {
      if (!pendingReloadRef.current) return;
      try {
        await reloadWithResurfacing(visible);
        pendingReloadRef.current = false;
        await markPendingReload(false);
      } catch {
        pendingReloadRef.current = true;
        await markPendingReload(true);
      }
    };

    const scheduleForegroundReload = () => {
      clearForegroundReloadTimer();
      foregroundReloadTimerRef.current = setTimeout(() => {
        foregroundReloadTimerRef.current = null;
        if (!pendingReloadRef.current || appStateRef.current !== 'active') {
          return;
        }
        void applyPendingReload(true);
      }, FOREGROUND_RELOAD_DELAY_MS);
    };

    const checkAndDownload = async (options?: { bypassCooldown?: boolean }) => {
      const now = Date.now();
      if (checkingRef.current) {
        return;
      }
      if (!options?.bypassCooldown && now - lastCheckRef.current < CHECK_COOLDOWN_MS) {
        return;
      }

      checkingRef.current = true;
      lastCheckRef.current = now;
      try {
        const result = await Updates.checkForUpdateAsync();
        if (!result.isAvailable) return;

        await Updates.fetchUpdateAsync();
        pendingReloadRef.current = true;
        await markPendingReload(true);

        const canReloadNow =
          appStateRef.current !== 'active' || isAuthPath(pathnameRef.current);

        if (canReloadNow) {
          await applyPendingReload(appStateRef.current === 'active');
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

    const interactionTask = InteractionManager.runAfterInteractions(() => {
      void checkAndDownload({ bypassCooldown: true });
    });

    const pollTimer = setInterval(() => {
      if (appStateRef.current === 'active') {
        void checkAndDownload();
      }
    }, FOREGROUND_POLL_MS);

    const subscription = AppState.addEventListener('change', (nextState) => {
      const wasActive = appStateRef.current === 'active';
      const leavingActive = nextState === 'background' || nextState === 'inactive';
      const returningActive =
        (appStateRef.current === 'background' || appStateRef.current === 'inactive') &&
        nextState === 'active';

      if (wasActive && leavingActive) {
        clearForegroundReloadTimer();
        if (pendingReloadRef.current) {
          void applyPendingReload(false);
        } else {
          void checkAndDownload({ bypassCooldown: true });
        }
      }

      if (returningActive) {
        void checkAndDownload();
        if (pendingReloadRef.current) {
          scheduleForegroundReload();
        }
      }

      appStateRef.current = nextState;
    });

    return () => {
      clearTimeout(initialTimer);
      clearInterval(pollTimer);
      clearForegroundReloadTimer();
      interactionTask.cancel?.();
      subscription.remove();
    };
  }, []);

  // Auth screens: apply a pending bundle as soon as user opens login/register.
  useEffect(() => {
    if (!isAuthPath(pathname)) return;
    void applyOtaUpdateIfPending();
  }, [pathname]);
}
