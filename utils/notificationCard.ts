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
