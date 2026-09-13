import { useEffect, useRef } from 'react';
import { AppState, InteractionManager, type AppStateStatus, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePathname } from 'expo-router';
import * as Updates from 'expo-updates';
import { markOtaJustUpdated, presentOtaReload } from '../utils/otaReloadSignal';

const CHECK_COOLDOWN_MS = 5 * 60_000;
const FOREGROUND_POLL_MS = 15 * 60_000;
const INITIAL_DELAY_MS = 3_000;
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

/** Drop stale pending flags left when reloadAsync() killed JS before cleanup ran. */
async function reconcileStalePendingReload(): Promise<boolean> {
  try {
    const pending = await AsyncStorage.getItem(PENDING_UPDATE_KEY);
    if (pending !== '1') return false;

    const check = await Updates.checkForUpdateAsync();
    if (!check.isAvailable) {
      await markPendingReload(false);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Reload into the downloaded bundle. Always mark for the post-reload "лед залит" toast.
 * Visible overlay only on auth screens — main tabs always reload silently.
 */
async function reloadWithResurfacing(visible: boolean): Promise<void> {
  await markOtaJustUpdated();
  if (visible) {
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
    const pending = await reconcileStalePendingReload();
    if (!pending) {
      return false;
    }
    await markPendingReload(false);
    await reloadWithResurfacing(true);
    return true;
  } catch {
    await markPendingReload(true);
    return false;
  }
}

/**
 * Downloads OTA updates in the background and applies them when safe:
 * - user leaves the app (background / inactive) — silent reload
 * - user opens login or register (critical auth fixes) — visible overlay
 * - periodic poll while app stays in foreground
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

    void reconcileStalePendingReload().then((pending) => {
      pendingReloadRef.current = pending;
    });

    const applyPendingReload = async (visible: boolean) => {
      if (!pendingReloadRef.current) return;

      // Must clear BEFORE reloadAsync — the process is replaced immediately and
      // post-reload cleanup never runs (was causing reload on every background).
      pendingReloadRef.current = false;
      await markPendingReload(false);

      try {
        await reloadWithResurfacing(visible);
      } catch {
        pendingReloadRef.current = true;
        await markPendingReload(true);
      }
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

        const fetchResult = await Updates.fetchUpdateAsync();
        if (!fetchResult.isNew) return;

        pendingReloadRef.current = true;
        await markPendingReload(true);

        const canReloadNow =
          appStateRef.current !== 'active' || isAuthPath(pathnameRef.current);

        if (canReloadNow) {
          const visible = appStateRef.current === 'active' && isAuthPath(pathnameRef.current);
          await applyPendingReload(visible);
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

      if (wasActive && leavingActive) {
        if (pendingReloadRef.current) {
          void applyPendingReload(false);
        } else {
          void checkAndDownload({ bypassCooldown: true });
        }
      }

      if (leavingActive === false && nextState === 'active') {
        void checkAndDownload();
      }

      appStateRef.current = nextState;
    });

    return () => {
      clearTimeout(initialTimer);
      clearInterval(pollTimer);
      interactionTask.cancel?.();
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!isAuthPath(pathname)) return;
    void applyOtaUpdateIfPending();
  }, [pathname]);
}
