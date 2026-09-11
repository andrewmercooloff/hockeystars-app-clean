import { Dimensions } from 'react-native';
import { DESKTOP_LAYOUT_MIN_WIDTH } from '../hooks/useIsDesktopLayout';

/** Compact equal photo tiles (~3× smaller than old 42% screen width on desktop). */
export function getPhotoTileSize(screenWidth = Dimensions.get('window').width) {
  const width = Math.min(150, Math.max(112, Math.round(screenWidth * 0.22)));
  const height = Math.round(width * 0.75);
  return { width, height };
}

/** Video carousel tile height (width follows media aspect ratio). */
export function getVideoTileHeight(
  screenWidth = Dimensions.get('window').width,
  isDesktop = screenWidth >= DESKTOP_LAYOUT_MIN_WIDTH,
) {
  if (isDesktop) {
    return getPhotoTileSize(screenWidth).height;
  }
  const width = Math.min(Math.round(screenWidth * 0.72), 320);
  return Math.round(width * (9 / 16));
}

/** Width from fixed height and aspect ratio — previews are not cropped. */
export function widthForAspectHeight(
  aspectRatio: number,
  height: number,
  minWidth = 72,
  maxWidth = 320,
) {
  const safe = aspectRatio > 0.05 && aspectRatio < 20 ? aspectRatio : 1;
  return Math.min(maxWidth, Math.max(minWidth, Math.round(height * safe)));
}

/** @deprecated Prefer getVideoTileHeight + widthForAspectHeight */
export function getVideoTileSize(
  screenWidth = Dimensions.get('window').width,
  isDesktop = screenWidth >= DESKTOP_LAYOUT_MIN_WIDTH,
) {
  const height = getVideoTileHeight(screenWidth, isDesktop);
  return { width: Math.round(height * (16 / 9)), height };
}
