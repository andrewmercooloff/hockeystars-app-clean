import { Platform, ViewStyle } from 'react-native';

type CardShadow = Pick<
  ViewStyle,
  'shadowColor' | 'shadowOffset' | 'shadowOpacity' | 'shadowRadius' | 'elevation'
>;

/**
 * На Android elevation + borderRadius даёт тёмные полосы по бокам («шире сверху»).
 * На iOS оставляем тень как задумано.
 */
export function platformCardShadow(ios: CardShadow): CardShadow {
  if (Platform.OS === 'android') {
    return {
      elevation: 0,
      shadowOpacity: 0,
      shadowRadius: 0,
      shadowOffset: { width: 0, height: 0 },
      shadowColor: 'transparent',
    };
  }
  return ios;
}
