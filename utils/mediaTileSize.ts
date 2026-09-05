import { Dimensions } from 'react-native';
import { DESKTOP_LAYOUT_MIN_WIDTH } from '../hooks/useIsDesktopLayout';

/** Compact equal photo tiles (~3× smaller than old 42% screen width on desktop). */
export function getPhotoTileSize(screenWidth = Dimensions.get('window').width) {
  const width = Math.min(150, Math.max(112, Math.round(screenWidth * 0.22)));
  const height = Math.round(width * 0.75);
  return { width, height };
}

/** Video cards: same height as photos on desktop; comfortable 16:9 on mobile. */
export function getVideoTileSize(
  screenWidth = Dimensions.get('window').width,
  isDesktop = screenWidth >= DESKTOP_LAYOUT_MIN_WIDTH,
) {
  if (isDesktop) {
    const { height } = getPhotoTileSize(screenWidth);
    return { width: Math.round(height * (16 / 9)), height };
  }
  const width = Math.min(Math.round(screenWidth * 0.72), 320);
  return { width, height: Math.round(width * (9 / 16)) };
}
