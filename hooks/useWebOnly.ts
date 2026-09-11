import { useIsFocused } from '@react-navigation/native';
import { usePathname } from 'expo-router';
import { Platform } from 'react-native';

/**
 * Web-only subscriptions.
 *
 * Several screens need the current route or focus state purely to decide what to
 * render on web. Calling the underlying hooks unconditionally makes native pay
 * for them too: `usePathname` subscribes to the whole route-info store, so every
 * navigation anywhere re-renders the screen — including heavy ones like the home
 * rink while it is blurred.
 *
 * `Platform.OS` is fixed for the lifetime of the bundle, so branching on it never
 * changes hook order at runtime.
 */
const IS_WEB = Platform.OS === 'web';

/** Current pathname on web; empty string on native, without subscribing. */
export function useWebPathname(): string {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return IS_WEB ? usePathname() : '';
}

/** Focus state on web; always `true` on native, without subscribing. */
export function useWebIsFocused(): boolean {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return IS_WEB ? useIsFocused() : true;
}
