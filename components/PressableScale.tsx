import React, { useCallback } from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

type Props = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  /** Масштаб при нажатии (по умолчанию 0.97) */
  scaleTo?: number;
  children?: React.ReactNode;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Замена TouchableOpacity для карточек: мягкий scale-down при нажатии
 * без изменения прозрачности (контент остаётся читаемым).
 */
const PressableScale = React.memo(function PressableScale({
  style,
  scaleTo = 0.97,
  onPressIn,
  onPressOut,
  children,
  ...rest
}: Props) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleIn = useCallback(
    (e: any) => {
      scale.value = withTiming(scaleTo, { duration: 90 });
      onPressIn?.(e);
    },
    [scaleTo, onPressIn, scale],
  );

  const handleOut = useCallback(
    (e: any) => {
      scale.value = withSpring(1, { damping: 18, stiffness: 260, mass: 0.6 });
      onPressOut?.(e);
    },
    [onPressOut, scale],
  );

  return (
    <AnimatedPressable
      {...rest}
      onPressIn={handleIn}
      onPressOut={handleOut}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
});

export default PressableScale;
