import type { ViewStyle } from 'react-native';
import { platformCardShadow } from './androidShadow';

/** Single card look for every feed item (blur wrapper + inner surface). */
export const NOTIFICATION_CARD_BLUR: ViewStyle = {
  borderRadius: 16,
  marginHorizontal: 16,
  marginVertical: 6,
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
  borderRadius: 16,
  padding: 16,
};

export const NOTIFICATION_CARD_COLUMN: ViewStyle = {
  ...NOTIFICATION_CARD,
};

export const NOTIFICATION_CARD_ROW: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'flex-start',
};

export const NOTIFICATION_REACTIONS_INSET: ViewStyle = {
  marginTop: 6,
  paddingTop: 6,
  paddingHorizontal: 14,
  paddingBottom: 6,
  borderTopWidth: 0.5,
  borderTopColor: 'rgba(255, 255, 255, 0.08)',
  width: '100%',
  alignSelf: 'stretch',
};

/** For cards that already have inner padding (stats, physical data, etc.). */
export const NOTIFICATION_REACTIONS_INSET_PADDED: ViewStyle = {
  marginTop: 6,
  paddingTop: 6,
  paddingBottom: 0,
  borderTopWidth: 0.5,
  borderTopColor: 'rgba(255, 255, 255, 0.08)',
  width: '100%',
  alignSelf: 'stretch',
};
