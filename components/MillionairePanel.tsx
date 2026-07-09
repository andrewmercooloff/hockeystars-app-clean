import React, { useState } from 'react';
import { LayoutChangeEvent, StyleProp, StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';

type Props = {
  children: React.ReactNode;
  width?: number;
  cut?: number;
  style?: StyleProp<ViewStyle>;
};

/** Панель со срезанными углами в стиле «Кто хочет стать миллионером» */
export function MillionairePanel({ children, width, cut = 14, style }: Props) {
  const [boxH, setBoxH] = useState(0);
  const panelWidth = width ?? 320;

  const onLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h > 0 && Math.abs(h - boxH) > 2) setBoxH(h);
  };

  const h = Math.max(boxH, 80);
  const points = `${cut},2 ${panelWidth - cut},2 ${panelWidth - 2},${cut} ${panelWidth - 2},${h - cut} ${panelWidth - cut},${h} ${cut},${h} 2,${h - cut} 2,${cut}`;

  return (
    <View style={[styles.wrap, { width: panelWidth }, style]} onLayout={onLayout}>
      {boxH > 0 && (
        <Svg width={panelWidth} height={h} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Polygon points={points} fill="rgba(12, 6, 36, 0.94)" stroke="#E8C547" strokeWidth={2} />
        </Svg>
      )}
      <View style={styles.inner}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'center',
    position: 'relative',
  },
  inner: {
    paddingHorizontal: 22,
    paddingVertical: 20,
  },
});

export function MillionaireButton({
  children,
  onPress,
  disabled,
  variant = 'primary',
  style,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
  style?: StyleProp<ViewStyle>;
}) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const cut = 10;
  const fill = variant === 'secondary' ? 'rgba(20, 8, 48, 0.55)' : '#5b2288';
  const stroke = variant === 'secondary' ? 'rgba(232, 197, 71, 0.55)' : '#E8C547';

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) setSize({ w: width, h: height });
  };

  const points =
    size.w > 0
      ? `${cut},1 ${size.w - cut},1 ${size.w - 1},${cut} ${size.w - 1},${size.h - cut} ${size.w - cut},${size.h} ${cut},${size.h} 1,${size.h - cut} 1,${cut}`
      : '';

  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      style={[btnStyles.wrap, style, disabled && btnStyles.disabled]}
    >
      <View style={btnStyles.inner} onLayout={onLayout}>
        {size.w > 0 && (
          <Svg width={size.w} height={size.h} style={StyleSheet.absoluteFill} pointerEvents="none">
            <Polygon points={points} fill={fill} stroke={stroke} strokeWidth={2} />
          </Svg>
        )}
        <View style={btnStyles.content}>{children}</View>
      </View>
    </Wrapper>
  );
}

const btnStyles = StyleSheet.create({
  wrap: {
    alignSelf: 'center',
    marginTop: 8,
  },
  inner: {
    position: 'relative',
    minWidth: 200,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 26,
    paddingVertical: 14,
  },
  disabled: {
    opacity: 0.45,
  },
});
