import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  Polygon,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

/** Five-point star points (outer radius r, inner radius r*0.46 — the chunky logo proportion). */
export const starPoints = (cx: number, cy: number, r: number, rotationDeg = 0): string => {
  const inner = r * 0.46;
  const rot = (rotationDeg * Math.PI) / 180;
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? r : inner;
    const a = -Math.PI / 2 + rot + (i * Math.PI) / 5;
    pts.push(`${(cx + radius * Math.cos(a)).toFixed(1)},${(cy + radius * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(' ');
};

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
            <Stop offset="0%" stopColor="#8d86b8" stopOpacity="0" />
            <Stop offset="70%" stopColor="#8d86b8" stopOpacity="0" />
            <Stop offset="100%" stopColor="#7d74b0" stopOpacity="0.10" />
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
 * Night arena for content screens: the logo star, oversized and tilted like
 * in the wordmark, bleeding off the top-right edge so only two rays show —
 * plus a soft accent line low on the screen. Brand at a glance, never clipart.
 */
export const RinkAccent = React.memo(function RinkAccent() {
  const { width, height } = useWindowDimensions();
  // Whole star readable in the lower-right quadrant, one ray leaving the frame
  const r = Math.max(width, 360) * 0.5;
  const cx = width * 0.74;
  const cy = height * 0.66;
  const outer = starPoints(cx, cy, r, -14);
  const inner = starPoints(cx, cy, r * 0.82, -14);
  const core = starPoints(cx, cy, r * 0.3, -14);
  // Arena light beam: a soft diagonal band from the top-left rig
  const beam = `${-width * 0.1},${-height * 0.05} ${width * 0.42},${-height * 0.05} ${width * 1.05},${height * 0.62} ${width * 0.55},${height * 0.62}`;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={height}>
        <Defs>
          {/* Brand-side tint: violet-graphite (between our red and the scout purple), not arena blue */}
          <RadialGradient id="arenaLight" cx="50%" cy="0%" r="85%" gradientUnits="objectBoundingBox">
            <Stop offset="0%" stopColor="#7b5ea8" stopOpacity="0.15" />
            <Stop offset="60%" stopColor="#7b5ea8" stopOpacity="0.03" />
            <Stop offset="100%" stopColor="#7b5ea8" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="arenaWarm" cx="8%" cy="100%" r="60%" gradientUnits="objectBoundingBox">
            <Stop offset="0%" stopColor="#fa2f40" stopOpacity="0.07" />
            <Stop offset="100%" stopColor="#fa2f40" stopOpacity="0" />
          </RadialGradient>
          <LinearGradient id="beam" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
            <Stop offset="50%" stopColor="#ffffff" stopOpacity="0.035" />
            <Stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </LinearGradient>
          <RadialGradient id="starFill" cx="50%" cy="50%" r="50%" gradientUnits="objectBoundingBox">
            <Stop offset="0%" stopColor="#fa2f40" stopOpacity="0.16" />
            <Stop offset="55%" stopColor="#fa2f40" stopOpacity="0.06" />
            <Stop offset="100%" stopColor="#fa2f40" stopOpacity="0.02" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width={width} height={height} fill="url(#arenaLight)" />
        <Rect x="0" y="0" width={width} height={height} fill="url(#arenaWarm)" />
        <Polygon points={beam} fill="url(#beam)" />
        <Polygon points={outer} fill="url(#starFill)" stroke="#fa2f40" strokeOpacity={0.22} strokeWidth={2} strokeLinejoin="round" />
        <Polygon points={inner} fill="none" stroke="#ffffff" strokeOpacity={0.05} strokeWidth={1} strokeLinejoin="round" />
        <Polygon points={core} fill="#fa2f40" fillOpacity={0.1} />
      </Svg>
    </View>
  );
});
