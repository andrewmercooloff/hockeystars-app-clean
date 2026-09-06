import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  Path,
  Polygon,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

/**
 * Logo star as an SVG path: chunkier body (inner radius 0.5r) with rounded
 * tips and softened inner corners — the wordmark silhouette, not a sheriff badge.
 */
export const roundedStarPath = (cx: number, cy: number, r: number, rotationDeg = 0): string => {
  const inner = r * 0.5;
  const rot = (rotationDeg * Math.PI) / 180;
  const pts: { x: number; y: number; round: number }[] = [];
  for (let i = 0; i < 10; i++) {
    const isTip = i % 2 === 0;
    const radius = isTip ? r : inner;
    const a = -Math.PI / 2 + rot + (i * Math.PI) / 5;
    pts.push({
      x: cx + radius * Math.cos(a),
      y: cy + radius * Math.sin(a),
      round: isTip ? r * 0.16 : r * 0.07,
    });
  }
  const n = pts.length;
  const seg: string[] = [];
  for (let i = 0; i < n; i++) {
    const prev = pts[(i - 1 + n) % n];
    const cur = pts[i];
    const next = pts[(i + 1) % n];
    const toPrev = { x: prev.x - cur.x, y: prev.y - cur.y };
    const toNext = { x: next.x - cur.x, y: next.y - cur.y };
    const lenPrev = Math.hypot(toPrev.x, toPrev.y);
    const lenNext = Math.hypot(toNext.x, toNext.y);
    const d = Math.min(cur.round, lenPrev / 2, lenNext / 2);
    const inPt = { x: cur.x + (toPrev.x / lenPrev) * d, y: cur.y + (toPrev.y / lenPrev) * d };
    const outPt = { x: cur.x + (toNext.x / lenNext) * d, y: cur.y + (toNext.y / lenNext) * d };
    seg.push(
      `${i === 0 ? 'M' : 'L'} ${inPt.x.toFixed(1)} ${inPt.y.toFixed(1)} Q ${cur.x.toFixed(1)} ${cur.y.toFixed(1)} ${outPt.x.toFixed(1)} ${outPt.y.toFixed(1)}`
    );
  }
  return `${seg.join(' ')} Z`;
};

/** Sharp five-point star points (outer radius r, inner radius r*0.46). */
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
  const star = roundedStarPath(cx, cy, r, -14);
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
        <Path d={star} fill="url(#starFill)" stroke="#fa2f40" strokeOpacity={0.24} strokeWidth={2.5} strokeLinejoin="round" />
      </Svg>
    </View>
  );
});
