import React, { useEffect } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../theme/colors';

type Props = {
  /** Сколько строк-заглушек показать */
  rows?: number;
  /** Высота карточки */
  rowHeight?: number;
  /** С круглым аватаром слева */
  avatar?: boolean;
  style?: ViewStyle;
};

/**
 * Пульсирующие серые заглушки вместо спиннера. Один анимированный
 * контейнер на весь список — дёшево для UI-потока.
 */
const SkeletonList = React.memo(function SkeletonList({
  rows = 6,
  rowHeight = 88,
  avatar = true,
  style,
}: Props) {
  const opacity = useSharedValue(0.55);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [opacity]);

  const pulse = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[styles.wrap, pulse, style]} pointerEvents="none">
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={[styles.row, { height: rowHeight }]}>
          {avatar ? <View style={styles.avatar} /> : null}
          <View style={styles.lines}>
            <View style={[styles.line, { width: i % 2 ? '55%' : '68%' }]} />
            <View style={[styles.line, styles.lineThin, { width: i % 3 ? '82%' : '70%' }]} />
            <View style={[styles.line, styles.lineThin, { width: '40%' }]} />
          </View>
        </View>
      ))}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    paddingTop: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.card,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.10)',
    marginRight: 14,
  },
  lines: {
    flex: 1,
    justifyContent: 'center',
  },
  line: {
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginBottom: 8,
  },
  lineThin: {
    height: 9,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginBottom: 6,
  },
});

export default SkeletonList;
