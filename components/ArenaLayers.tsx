import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

/**
 * Lighting for bright ice scenes (home, auth, games). Ice stays light —
 * we only add what a real arena adds: a cool spotlight from above and a
 * faint warm brand reflection low on the surface. No darkening.
 */
export const IceLighting = React.memo(function IceLighting() {
  const { width, height } = useWindowDimensions();
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={height}>
        <Defs>
          <RadialGradient id="iceSpot" cx="50%" cy="8%" r="70%" gradientUnits="objectBoundingBox">
            <Stop offset="0%" stopColor="#ffffff" stopOpacity="0.22" />
            <Stop offset="55%" stopColor="#ffffff" stopOpacity="0.05" />
            <Stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="iceWarm" cx="88%" cy="96%" r="55%" gradientUnits="objectBoundingBox">
            <Stop offset="0%" stopColor="#fa2f40" stopOpacity="0.09" />
            <Stop offset="100%" stopColor="#fa2f40" stopOpacity="0" />
          </RadialGradient>
          <LinearGradient id="iceDepth" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#8fb6d6" stopOpacity="0" />
            <Stop offset="70%" stopColor="#8fb6d6" stopOpacity="0" />
            <Stop offset="100%" stopColor="#6f9cc4" stopOpacity="0.14" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width={width} height={height} fill="url(#iceDepth)" />
        <Rect x="0" y="0" width={width} height={height} fill="url(#iceSpot)" />
        <Rect x="0" y="0" width={width} height={height} fill="url(#iceWarm)" />
      </Svg>
    </View>
  );
});

/**
 * Night arena for content screens: one oversized face-off circle bleeding
 * off the top-right edge and a blue line low on the screen. Reads as hockey
 * at a glance without competing with cards or text.
 */
export const RinkAccent = React.memo(function RinkAccent() {
  const { width, height } = useWindowDimensions();
  const r = Math.max(width, 360) * 0.62;
  const cx = width * 0.96;
  const cy = -r * 0.28;
  const blueY = height * 0.78;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={height}>
        <Defs>
          <RadialGradient id="arenaLight" cx="50%" cy="0%" r="85%" gradientUnits="objectBoundingBox">
            <Stop offset="0%" stopColor="#5d7fa8" stopOpacity="0.16" />
            <Stop offset="60%" stopColor="#5d7fa8" stopOpacity="0.03" />
            <Stop offset="100%" stopColor="#5d7fa8" stopOpacity="0" />
          </RadialGradient>
          <LinearGradient id="blueLine" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor="#3f7bd6" stopOpacity="0" />
            <Stop offset="25%" stopColor="#3f7bd6" stopOpacity="0.16" />
            <Stop offset="75%" stopColor="#3f7bd6" stopOpacity="0.16" />
            <Stop offset="100%" stopColor="#3f7bd6" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width={width} height={height} fill="url(#arenaLight)" />
        <Circle cx={cx} cy={cy} r={r} stroke="#fa2f40" strokeOpacity={0.075} strokeWidth={2.5} fill="none" />
        <Circle cx={cx} cy={cy} r={r * 0.94} stroke="#fa2f40" strokeOpacity={0.03} strokeWidth={1} fill="none" />
        <Line x1={0} y1={blueY} x2={width} y2={blueY} stroke="url(#blueLine)" strokeWidth={3} />
      </Svg>
    </View>
  );
});
