import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { getPerformanceLevel } from '../utils/devicePerformance';

type LeaderShineProps = {
  size: number;
  color: string;
  delayMs?: number;
};

const CYCLE_MS = 2800;
const MAX_SCALE = 1.38;

/**
 * Сияние лидера: тонкое кольцо цвета медали медленно расходится.
 * На слабых устройствах не рендерится.
 */
const LeaderShine: React.FC<LeaderShineProps> = ({ size, color, delayMs = 0 }) => {
  const animate = getPerformanceLevel() !== 'low';
  const progress = useSharedValue(0);
  const progress2 = useSharedValue(0);

  useEffect(() => {
    if (!animate) return;
    progress.value = 0;
    progress2.value = 0;
    progress.value = withDelay(
      delayMs,
      withRepeat(
        withTiming(1, { duration: CYCLE_MS, easing: Easing.out(Easing.quad) }),
        -1,
        false
      )
    );
    progress2.value = withDelay(
      delayMs + Math.round(CYCLE_MS * 0.45),
      withRepeat(
        withTiming(1, { duration: CYCLE_MS, easing: Easing.out(Easing.quad) }),
        -1,
        false
      )
    );
    return () => {
      cancelAnimation(progress);
      cancelAnimation(progress2);
    };
  }, [animate, delayMs, progress, progress2]);

  const ringStyle = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: (1 - p) * 0.55,
      transform: [{ scale: 1 + (MAX_SCALE - 1) * p }],
    };
  });
  const ringStyle2 = useAnimatedStyle(() => {
    const p = progress2.value;
    return {
      opacity: (1 - p) * 0.35,
      transform: [{ scale: 1 + (MAX_SCALE - 1) * p }],
    };
  });

  if (!animate) return null;

  const ring = {
    width: size,
    height: size,
    borderRadius: size / 2,
    borderColor: color,
  };

  return (
    <>
      <Animated.View pointerEvents="none" style={[styles.ring, ring, ringStyle]} />
      <Animated.View pointerEvents="none" style={[styles.ring, ring, ringStyle2]} />
    </>
  );
};

const styles = StyleSheet.create({
  ring: {
    position: 'absolute',
    borderWidth: 1.5,
    zIndex: 2,
  },
});

export default React.memo(LeaderShine);
