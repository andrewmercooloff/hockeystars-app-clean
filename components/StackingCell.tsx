import React from 'react';
import { Dimensions, StyleSheet, type ViewStyle } from 'react-native';
import Animated, {
  measure,
  useAnimatedRef,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';

type Props = {
  children: React.ReactNode;
  index?: number;
  style?: ViewStyle | ViewStyle[];
  scrollY: SharedValue<number>;
  enabled?: boolean;
};

/**
 * У нижнего края экрана карточка не обрезается, а слегка стопкой
 * «листается» снизу — как стек уведомлений iPhone.
 */
export default function StackingCell({
  children,
  style,
  scrollY,
  enabled = true,
  ...rest
}: Props & Record<string, unknown>) {
  const host = useAnimatedRef<Animated.View>();
  const windowH = Dimensions.get('window').height;

  const anim = useAnimatedStyle(() => {
    const _y = scrollY.value;
    if (!enabled) return {};
    try {
      const m = measure(host);
      if (!m || m.height < 1) return {};
      const bottom = m.pageY + m.height;
      const stackStart = windowH - 168;
      if (bottom <= stackStart) {
        return { transform: [{ scale: 1 }, { translateY: 0 }] };
      }
      const t = Math.min(1, Math.max(0, (bottom - stackStart) / 130));
      return {
        transform: [{ translateY: t * 22 }, { scale: 1 - t * 0.07 }],
        opacity: 1 - t * 0.12,
      };
    } catch {
      return {};
    }
  });

  return (
    <Animated.View
      ref={host}
      collapsable={false}
      style={[style as ViewStyle, styles.host, anim]}
      {...rest}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  host: {
    overflow: 'visible',
  },
});
