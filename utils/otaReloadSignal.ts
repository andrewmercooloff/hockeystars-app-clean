import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Bridge between the OTA hook (decides *when* to reload) and the root layout
 * (renders the "ice resurfacing" overlay). Keeps expo-updates out of UI code.
 */

type Listener = (done: () => void) => void;

let listener: Listener | null = null;

/** Root layout registers how to show the overlay; `done` is called once the animation has covered the screen. */
export function setOtaReloadPresenter(next: Listener | null): void {
  listener = next;
}

/** Ask the UI to cover the screen before a visible reload. Resolves when it's safe to reload. */
export function presentOtaReload(maxWaitMs = 2600): Promise<void> {
  if (!listener) return Promise.resolve();
  return new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(guard);
      resolve();
    };
    const guard = setTimeout(finish, maxWaitMs);
    try {
      listener?.(finish);
    } catch {
      finish();
    }
  });
}

const JUST_UPDATED_KEY = 'hs_ota_just_updated_v1';
const JUST_UPDATED_MAX_AGE_MS = 10 * 60_000;

function isFreshJustUpdated(raw: string | null): boolean {
  if (!raw) return false;
  const at = Number(raw);
  return Number.isFinite(at) && Date.now() - at < JUST_UPDATED_MAX_AGE_MS;
}

/** Remember that the next launch is the result of an OTA reload (to show a short "updated" toast). */
export async function markOtaJustUpdated(): Promise<void> {
  try {
    await AsyncStorage.setItem(JUST_UPDATED_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

/** Read the just-updated flag without consuming it (used by unified boot resolution). */
export async function peekOtaJustUpdated(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(JUST_UPDATED_KEY);
    return isFreshJustUpdated(raw);
  } catch {
    return false;
  }
}

/** Clear the just-updated flag after boot resolution consumed it. */
export async function clearOtaJustUpdated(): Promise<void> {
  try {
    await AsyncStorage.removeItem(JUST_UPDATED_KEY);
  } catch {
    /* ignore */
  }
}

/** Returns true once after an OTA reload (flag is consumed; stale flags older than 10 min are dropped). */
export async function consumeOtaJustUpdated(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(JUST_UPDATED_KEY);
    if (!isFreshJustUpdated(raw)) {
      if (raw) await AsyncStorage.removeItem(JUST_UPDATED_KEY);
      return false;
    }
    await AsyncStorage.removeItem(JUST_UPDATED_KEY);
    return true;
  } catch {
    return false;
  }
}
