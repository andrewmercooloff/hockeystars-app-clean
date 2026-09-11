import type { ViewStyle } from 'react-native';
import { platformCardShadow } from './androidShadow';

/** Single card look for every feed item (blur wrapper + inner surface). */
export const NOTIFICATION_CARD_BLUR: ViewStyle = {
  borderRadius: 14,
  marginHorizontal: 16,
  marginVertical: 4,
  overflow: 'hidden',
  ...platformCardShadow({
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 5,
    elevation: 2,
  }),
};

export const NOTIFICATION_CARD: ViewStyle = {
  backgroundColor: '#1c1c21',
  borderWidth: 1,
  borderColor: 'rgba(255, 255, 255, 0.06)',
  borderRadius: 14,
  padding: 12,
};

export const NOTIFICATION_CARD_COLUMN: ViewStyle = {
  ...NOTIFICATION_CARD,
};

export const NOTIFICATION_CARD_ROW: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'flex-start',
};

export const NOTIFICATION_REACTIONS_INSET: ViewStyle = {
  marginTop: 10,
  paddingTop: 0,
  paddingHorizontal: 12,
  paddingBottom: 0,
  width: '100%',
  alignSelf: 'stretch',
};

/** For cards that already have inner padding (stats, physical data, etc.). */
export const NOTIFICATION_REACTIONS_INSET_PADDED: ViewStyle = {
  marginTop: 10,
  paddingTop: 0,
  paddingBottom: 0,
  width: '100%',
  alignSelf: 'stretch',
};

/** Red delta badge used on stats / achievement / exercise rows. */
export const NOTIFICATION_DELTA_BADGE: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 4,
  paddingHorizontal: 8,
  paddingVertical: 2,
  borderRadius: 12,
  minWidth: 32,
  backgroundColor: '#FF4444',
};
