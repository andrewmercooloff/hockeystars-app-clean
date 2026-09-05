import { Platform, useWindowDimensions } from 'react-native';

/** Facebook-style desktop shell kicks in on wide web viewports only. */
export const DESKTOP_LAYOUT_MIN_WIDTH = 1024;

export function useIsDesktopLayout(): boolean {
  const { width } = useWindowDimensions();
  return Platform.OS === 'web' && width >= DESKTOP_LAYOUT_MIN_WIDTH;
}
