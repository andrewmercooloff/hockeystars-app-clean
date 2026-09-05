import React, { useId } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import Svg, { Circle, Defs, G, Line, Path, Pattern, Rect } from 'react-native-svg';

/**
 * Chat-wallpaper фон (Telegram / WhatsApp style).
 *
 * Важно для перфа: один <Rect fill="url(#pattern)"> вместо сотен SVG-нод.
 * На неактивных табах не рендерим вообще — иначе шайбы на home начинают дёргаться.
 */
const TILE = 72;

function TileArt({ stroke }: { stroke: string }) {
  return (
    <G>
      {/* puck */}
      <Circle cx={14} cy={16} r={5} stroke={stroke} strokeWidth={1.1} fill="none" />
      <Circle cx={14} cy={16} r={1.4} fill={stroke} />

      {/* stick */}
      <Path
        d="M40 28 L48 12 L52 10.5 L54.5 13 L51 16 L44.5 29"
        stroke={stroke}
        strokeWidth={1.15}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* star */}
      <Path
        d="M58 42 L59.4 46.2 L63.8 46.4 L60.5 49.1 L61.7 53.4 L58 51.1 L54.3 53.4 L55.5 49.1 L52.2 46.4 L56.6 46.2 Z"
        stroke={stroke}
        strokeWidth={1}
        fill="none"
        strokeLinejoin="round"
      />

      {/* skate */}
      <Path
        d="M10 48 C12.5 44.5, 17 44, 21 45.8 L24 49 L22.2 52 H11.5 Z"
        stroke={stroke}
        strokeWidth={1.05}
        fill="none"
        strokeLinejoin="round"
      />
      <Line x1={11} y1={53.2} x2={23} y2={53.2} stroke={stroke} strokeWidth={1.1} strokeLinecap="round" />

      {/* flake */}
      <Line x1={36} y1={50} x2={36} y2={62} stroke={stroke} strokeWidth={1} strokeLinecap="round" />
      <Line x1={30} y1={56} x2={42} y2={56} stroke={stroke} strokeWidth={1} strokeLinecap="round" />
      <Line x1={31.5} y1={51.5} x2={40.5} y2={60.5} stroke={stroke} strokeWidth={1} strokeLinecap="round" />
      <Line x1={40.5} y1={51.5} x2={31.5} y2={60.5} stroke={stroke} strokeWidth={1} strokeLinecap="round" />

      {/* whistle */}
      <Circle cx={58} cy={16} r={3.6} stroke={stroke} strokeWidth={1.05} fill="none" />
      <Circle cx={58} cy={16} r={1.1} fill={stroke} />
      <Path
        d="M61.2 14.4 L66 12.4 L66.8 13.8 L62 15.8"
        stroke={stroke}
        strokeWidth={1.05}
        fill="none"
        strokeLinejoin="round"
      />

      {/* net */}
      <Rect x={30} y={8} width={10} height={8} rx={1} stroke={stroke} strokeWidth={1} fill="none" />
      <Line x1={30} y1={8} x2={40} y2={16} stroke={stroke} strokeWidth={0.8} />
      <Line x1={40} y1={8} x2={30} y2={16} stroke={stroke} strokeWidth={0.8} />
    </G>
  );
}

const HockeyPattern = React.memo(function HockeyPattern({ opacity = 0.045 }: { opacity?: number }) {
  const { width, height } = useWindowDimensions();
  // Вкладки остаются смонтированными — на фоне паттерн нельзя оставлять живым.
  const isFocused = useIsFocused();
  const patternId = `hsWall-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;

  if (!isFocused) {
    return null;
  }

  const stroke = 'rgba(255,255,255,0.9)';
  const w = Math.max(1, Math.ceil(width));
  const h = Math.max(1, Math.ceil(height));

  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { opacity }]}
      // Растрируем в текстуру — дешевле, чем живой SVG на каждом кадре.
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
