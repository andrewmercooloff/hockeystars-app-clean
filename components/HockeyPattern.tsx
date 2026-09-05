import React, { useId } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import Svg, { Circle, Defs, G, Line, Path, Pattern, Rect } from 'react-native-svg';

/**
 * Chat-wallpaper фон (Telegram / WhatsApp style).
 * Крупные doodles, плотная плитка — один Pattern fill (дешево для перфа).
 */
const TILE = 54;

function TileArt({ stroke }: { stroke: string }) {
  return (
    <G>
      {/* puck — крупнее */}
      <Circle cx={12} cy={14} r={7} stroke={stroke} strokeWidth={1.35} fill="none" />
      <Circle cx={12} cy={14} r={2} fill={stroke} />

      {/* stick */}
      <Path
        d="M30 24 L40 6 L44.5 4 L48 7.5 L43 12 L34.5 26"
        stroke={stroke}
        strokeWidth={1.4}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* star */}
      <Path
        d="M42 34 L44.2 40.2 L50.8 40.5 L45.6 44.6 L47.4 51 L42 47.4 L36.6 51 L38.4 44.6 L33.2 40.5 L39.8 40.2 Z"
        stroke={stroke}
        strokeWidth={1.2}
        fill="none"
        strokeLinejoin="round"
      />

      {/* skate */}
      <Path
        d="M6 36 C9.5 31.5, 16 31, 21.5 33.5 L26 38 L23.5 42 H8 Z"
        stroke={stroke}
        strokeWidth={1.25}
        fill="none"
        strokeLinejoin="round"
      />
      <Line x1={7.5} y1={43.5} x2={24.5} y2={43.5} stroke={stroke} strokeWidth={1.3} strokeLinecap="round" />

      {/* flake */}
      <Line x1={27} y1={38} x2={27} y2={52} stroke={stroke} strokeWidth={1.2} strokeLinecap="round" />
      <Line x1={20} y1={45} x2={34} y2={45} stroke={stroke} strokeWidth={1.2} strokeLinecap="round" />
      <Line x1={21.8} y1={39.8} x2={32.2} y2={50.2} stroke={stroke} strokeWidth={1.2} strokeLinecap="round" />
      <Line x1={32.2} y1={39.8} x2={21.8} y2={50.2} stroke={stroke} strokeWidth={1.2} strokeLinecap="round" />

      {/* whistle */}
      <Circle cx={44} cy={14} r={5} stroke={stroke} strokeWidth={1.25} fill="none" />
      <Circle cx={44} cy={14} r={1.5} fill={stroke} />
      <Path
        d="M48.5 11.8 L53.8 9.2 L55 11.2 L49.6 13.8"
        stroke={stroke}
        strokeWidth={1.25}
        fill="none"
        strokeLinejoin="round"
      />
    </G>
  );
}

const HockeyPattern = React.memo(function HockeyPattern({ opacity = 0.055 }: { opacity?: number }) {
  const { width, height } = useWindowDimensions();
  const isFocused = useIsFocused();
  const patternId = `hsWall-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;

  if (!isFocused) {
    return null;
  }

  const stroke = 'rgba(255,255,255,0.92)';
  const w = Math.max(1, Math.ceil(width));
  const h = Math.max(1, Math.ceil(height));

  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { opacity }]}
      shouldRasterizeIOS
      renderToHardwareTextureAndroid
      collapsable={false}
    >
      <Svg width={w} height={h}>
        <Defs>
          <Pattern
            id={patternId}
            patternUnits="userSpaceOnUse"
            width={TILE}
            height={TILE}
          >
            <TileArt stroke={stroke} />
          </Pattern>
        </Defs>
        <Rect x={0} y={0} width={w} height={h} fill={`url(#${patternId})`} />
      </Svg>
    </View>
  );
});

export default HockeyPattern;
