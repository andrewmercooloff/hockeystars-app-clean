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

/** Remember that the next launch is the result of an OTA reload (to show a short "updated" toast). */
export async function markOtaJustUpdated(): Promise<void> {
  try {
    await AsyncStorage.setItem(JUST_UPDATED_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

/** Returns true once after an OTA reload (flag is consumed; stale flags older than 10 min are dropped). */
export async function consumeOtaJustUpdated(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(JUST_UPDATED_KEY);
    if (!raw) return false;
    await AsyncStorage.removeItem(JUST_UPDATED_KEY);
    const at = Number(raw);
    return Number.isFinite(at) && Date.now() - at < 10 * 60_000;
  } catch {
    return false;
  }
}
