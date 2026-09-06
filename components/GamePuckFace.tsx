import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Polygon,
  RadialGradient,
  Stop,
} from 'react-native-svg';
import { roundedStarPath } from './ArenaLayers';

type Kind = 'game' | 'quiz';

const ACCENT: Record<Kind, [string, string]> = {
  game: ['#fa2f40', '#ff7a5c'],
  quiz: ['#8b5cf6', '#c084fc'],
};

const LABEL: Record<Kind, string> = {
  game: 'STAR GOAL',
  quiz: 'QUIZ',
};

/**
 * Face for the two mini-game pucks. Same language as the scout puck:
 * matte dark disc, one thin gradient ring, a single white glyph, tiny caption.
 * Reads as a "special event" puck, not a placeholder icon.
 */
const GamePuckFace: React.FC<{ kind: Kind; size: number }> = ({ kind, size }) => {
  const [c1, c2] = ACCENT[kind];
  const s = size;
  const cx = s / 2;
  const ring = s * 0.47;
  const gradId = `gp-${kind}-${Math.round(s)}`;
  const faceId = `gf-${kind}-${Math.round(s)}`;

  const glyphY = s * 0.44;
  const glyphR = s * 0.2;

  return (
    <View style={{ width: s, height: s }}>
      <Svg width={s} height={s}>
        <Defs>
          <LinearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor={c1} stopOpacity="1" />
            <Stop offset="100%" stopColor={c2} stopOpacity="0.85" />
          </LinearGradient>
          <RadialGradient id={faceId} cx="38%" cy="30%" r="80%">
            <Stop offset="0%" stopColor="#26242e" />
            <Stop offset="100%" stopColor="#0f0e13" />
          </RadialGradient>
        </Defs>
        <Circle cx={cx} cy={cx} r={s / 2} fill={`url(#${faceId})`} />
        <Circle cx={cx} cy={cx} r={ring} stroke={`url(#${gradId})`} strokeWidth={Math.max(1.5, s * 0.03)} fill="none" />

        {kind === 'game' ? (
          <>
            {/* Logo star with a puck flying off its tip */}
            <Path
              d={roundedStarPath(cx, glyphY, glyphR, -14)}
              fill="none"
              stroke="#ffffff"
              strokeWidth={Math.max(1.5, s * 0.028)}
              strokeLinejoin="round"
            />
            <Circle cx={cx + glyphR * 1.05} cy={glyphY + glyphR * 0.15} r={s * 0.035} fill={c1} />
            <Path
              d={`M ${cx + glyphR * 0.55} ${glyphY + glyphR * 0.32} h ${glyphR * 0.32}`}
              stroke={c1}
              strokeOpacity={0.55}
              strokeWidth={s * 0.018}
              strokeLinecap="round"
            />
          </>
        ) : (
          <>
            {/* Schematic of the quiz logo: a wheel of sticks radiating from the centre,
                blades on the outer ends, four diamonds on the ring like the original. */}
            {Array.from({ length: 8 }, (_, i) => {
              const a = (i * Math.PI) / 4 + Math.PI / 8;
              const r0 = glyphR * 0.28;
              const r1 = glyphR * 1.08;
              const x0 = cx + r0 * Math.cos(a);
              const y0 = glyphY + r0 * Math.sin(a);
              const x1 = cx + r1 * Math.cos(a);
              const y1 = glyphY + r1 * Math.sin(a);
              // blade: short hook turning ~70° off the shaft
              const b = a + 1.22;
              const bl = glyphR * 0.36;
              const x2 = x1 + bl * Math.cos(b);
              const y2 = y1 + bl * Math.sin(b);
              return (
                <Path
                  key={i}
                  d={`M ${x0} ${y0} L ${x1} ${y1} L ${x2} ${y2}`}
                  stroke="#ffffff"
                  strokeOpacity={0.95}
                  strokeWidth={Math.max(1.4, s * 0.024)}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              );
            })}
            <Circle cx={cx} cy={glyphY} r={glyphR * 0.16} fill={c2} />
            {[0, 1, 2, 3].map((i) => {
              const a = (i * Math.PI) / 2;
              const dx = cx + ring * 0.86 * Math.cos(a);
              const dy = cx + ring * 0.86 * Math.sin(a);
              const d = s * 0.028;
              return (
                <Polygon
                  key={`d${i}`}
                  points={`${dx},${dy - d} ${dx + d},${dy} ${dx},${dy + d} ${dx - d},${dy}`}
                  fill={c2}
                  fillOpacity={0.9}
                />
              );
            })}
          </>
        )}
      </Svg>
      <Text
        style={[
          styles.label,
          { fontSize: Math.max(7, s * 0.085), bottom: s * 0.16, letterSpacing: s * 0.008 },
        ]}
        numberOfLines={1}
      >
        {LABEL[kind]}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  label: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.78)',
    fontFamily: 'Gilroy-Bold',
  },
});

export default GamePuckFace;
