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

type LeaderShineProps = {
  /** Диаметр медального кольца, вокруг которого расходится сияние */
  size: number;
  /** Цвет медали (золото/серебро/бронза) */
  color: string;
  /** Задержка старта — чтобы соседние лидеры «дышали» не синхронно */
  delayMs?: number;
};

const CYCLE_MS = 2800;
const MAX_SCALE = 1.38;

/**
 * Минималистичное сияние лидера: тонкое кольцо цвета медали медленно
 * расходится наружу и растворяется. Два кольца со сдвигом — чуть заметнее,
 * но без «колхозного» блеска. Анимация на UI-потоке (Reanimated).
 */
const LeaderShine: React.FC<LeaderShineProps> = ({ size, color, delayMs = 0 }) => {
  const progress = useSharedValue(0);
  const progress2 = useSharedValue(0);

  useEffect(() => {
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
      delayMs + CYCLE_MS * 0.45,
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
  }, [progress, progress2, delayMs]);

  const rippleStyle = useAnimatedStyle(() => ({
    opacity: 0.82 * (1 - progress.value),
    transform: [{ scale: 1 + (MAX_SCALE - 1) * progress.value }],
  }));

  const rippleStyle2 = useAnimatedStyle(() => ({
    opacity: 0.45 * (1 - progress2.value),
    transform: [{ scale: 1 + (MAX_SCALE - 1) * 0.75 * progress2.value }],
  }));

  return (
    <>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: color,
          },
          rippleStyle,
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: color,
          },
          rippleStyle2,
        ]}
      />
    </>
  );
};

const styles = StyleSheet.create({
  ring: {
    position: 'absolute',
    borderWidth: 2,
  },
});

export default LeaderShine;
