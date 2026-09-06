import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { getPerformanceLevel } from '../utils/devicePerformance';
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
/** Deterministic skate marks: long shallow arcs, a few sharp stop-cuts. Seeded, so the sheet is stable between renders. */
const skateMarks = (width: number, height: number): { d: string; w: number; o: number; dark: boolean }[] => {
  let seed = 7;
  const rnd = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  const out: { d: string; w: number; o: number; dark: boolean }[] = [];
  for (let i = 0; i < 22; i++) {
    const x0 = rnd() * width;
    const y0 = height * 0.12 + rnd() * height * 0.8;
    const len = width * (0.35 + rnd() * 0.75);
    const ang = -0.9 + rnd() * 1.8;
    const bend = (rnd() - 0.5) * len * 0.35;
    const x1 = x0 + Math.cos(ang) * len;
    const y1 = y0 + Math.sin(ang) * len;
    const cx = (x0 + x1) / 2 - Math.sin(ang) * bend;
    const cy = (y0 + y1) / 2 + Math.cos(ang) * bend;
    out.push({
      d: `M ${x0.toFixed(1)} ${y0.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`,
      w: 0.8 + rnd() * 0.9,
      o: 0.10 + rnd() * 0.16,
      dark: rnd() < 0.3,
    });
  }
  // stop-cuts: short, bright, slightly wider
  for (let i = 0; i < 6; i++) {
    const x0 = rnd() * width;
    const y0 = height * 0.2 + rnd() * height * 0.65;
    const ang = -0.6 + rnd() * 1.2;
    const len = 24 + rnd() * 40;
    out.push({
      d: `M ${x0.toFixed(1)} ${y0.toFixed(1)} l ${(Math.cos(ang) * len).toFixed(1)} ${(Math.sin(ang) * len).toFixed(1)}`,
      w: 1.4 + rnd() * 0.8,
      o: 0.22 + rnd() * 0.16,
      dark: false,
    });
  }
  return out;
};

export const IceLighting = React.memo(function IceLighting() {
  const { width, height } = useWindowDimensions();
  const marks = useMemo(() => skateMarks(width, height), [width, height]);
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
        {marks.map((m, i) => (
          <Path
            key={i}
            d={m.d}
            stroke={m.dark ? '#5a6486' : '#ffffff'}
            strokeOpacity={m.dark ? m.o * 0.5 : m.o}
            strokeWidth={m.w}
            strokeLinecap="round"
            fill="none"
          />
        ))}
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
    <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]} pointerEvents="none">
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
        </Defs>
        <Rect x="0" y="0" width={width} height={height} fill="url(#arenaLight)" />
        <Rect x="0" y="0" width={width} height={height} fill="url(#arenaWarm)" />
        <Polygon points={beam} fill="url(#beam)" />
        {/* Hollow outline like the home tab star: thick rounded stroke, nothing inside */}
        <Path
          d={star}
          fill="none"
          stroke="#fa2f40"
          strokeOpacity={0.085}
          strokeWidth={r * 0.085}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </Svg>
      <DriftingGlow width={width} height={height} />
    </View>
  );
});

/**
 * Slow "living" light on content screens: one soft violet blob drifting
 * diagonally and breathing. Transform/opacity only (GPU composite, UI thread),
 * no per-frame JS. Skipped on low-end devices.
 */
const DriftingGlow = React.memo(function DriftingGlow({ width, height }: { width: number; height: number }) {
  const enabled = getPerformanceLevel() !== 'low';
  const t = useSharedValue(0);
  useEffect(() => {
    if (!enabled) return;
    t.value = withRepeat(
      withTiming(1, { duration: 16000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, [enabled, t]);
  const size = Math.max(width, height) * 1.1;
  const style = useAnimatedStyle(() => ({
    opacity: 0.55 + 0.45 * t.value,
    transform: [
      { translateX: -size * 0.35 + width * 0.55 * t.value },
      { translateY: -size * 0.45 + height * 0.35 * t.value },
      { scale: 0.95 + 0.12 * t.value },
    ],
  }));
  if (!enabled) return null;
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: size, height: size }, style]}>
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id="driftGlow" cx="50%" cy="50%" r="50%" gradientUnits="objectBoundingBox">
            <Stop offset="0%" stopColor="#8d7cc7" stopOpacity="0.16" />
            <Stop offset="45%" stopColor="#8d7cc7" stopOpacity="0.06" />
            <Stop offset="100%" stopColor="#8d7cc7" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width={size} height={size} fill="url(#driftGlow)" />
      </Svg>
    </Animated.View>
  );
});
