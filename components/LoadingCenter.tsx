import React, { useEffect } from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../theme/colors';
import { useLanguage } from '../contexts/LanguageContext';
import { getPerformanceLevel } from '../utils/devicePerformance';

interface LoadingCenterProps {
  message?: string;
  style?: ViewStyle;
  size?: 'small' | 'large';
}

const DOT = 8;
const GAP = 8;
const CYCLE_MS = 1100;

const wave = (phase: number, offset: number) => {
  'worklet';
  const x = (phase + offset) % 1;
  return Math.sin(x * Math.PI);
};

/**
 * Лёгкий фирменный лоадер: три «шайбы», мягко пульсирующие волной.
 * Одинаковый на всех экранах; на слабых устройствах — статичные точки.
 */
export default function LoadingCenter({ message, style, size = 'large' }: LoadingCenterProps) {
  const { t } = useLanguage();
  const animate = getPerformanceLevel() !== 'low';
  const compact = size === 'small';
  const phase = useSharedValue(0);

  useEffect(() => {
    if (!animate) return;
    phase.value = withRepeat(withTiming(1, { duration: CYCLE_MS, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(phase);
  }, [animate, phase]);

  const s0 = useAnimatedStyle(() => {
    const w = wave(phase.value, 0);
    return { opacity: 0.3 + 0.7 * w, transform: [{ scale: 0.78 + 0.34 * w }] };
  });
  const s1 = useAnimatedStyle(() => {
    const w = wave(phase.value, 0.66);
    return { opacity: 0.3 + 0.7 * w, transform: [{ scale: 0.78 + 0.34 * w }] };
  });
  const s2 = useAnimatedStyle(() => {
    const w = wave(phase.value, 0.33);
    return { opacity: 0.3 + 0.7 * w, transform: [{ scale: 0.78 + 0.34 * w }] };
  });

  return (
    <View style={[styles.center, style]}>
      <View style={[styles.row, compact && styles.rowCompact]}>
        <Animated.View style={[styles.dot, animate ? s0 : styles.dotStatic]} />
        <Animated.View style={[styles.dot, animate ? s1 : styles.dotStatic]} />
        <Animated.View style={[styles.dot, animate ? s2 : styles.dotStatic]} />
      </View>
      {!compact ? <Text style={styles.text}>{message ?? t('common.loading')}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: GAP,
    height: 16,
  },
  rowCompact: {
    transform: [{ scale: 0.8 }],
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    backgroundColor: colors.brand,
  },
  dotStatic: {
    opacity: 0.7,
  },
  text: {
    marginTop: 14,
    color: colors.textMuted,
    fontSize: 13,
    fontFamily: 'Gilroy-Regular',
    letterSpacing: 0.2,
  },
});
