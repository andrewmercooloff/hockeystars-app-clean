import React, { useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import Svg, { Circle, G, Line, Path, Rect } from 'react-native-svg';

/**
 * Chat-wallpaper без видимого раппорта:
 * doodles разбросаны по экрану с джиттером/поворотом/пропусками ячеек.
 * Растрируем в текстуру + не рисуем на неактивных табах (шайбы на home).
 */
const CELL = 70;
const KINDS = ['puck', 'stick', 'star', 'skate', 'flake', 'whistle', 'net', 'helmet'] as const;
type DoodleKind = (typeof KINDS)[number];

function hash2(a: number, b: number): number {
  // Простой детерминированный хэш 0..1
  const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function Doodle({ kind, stroke }: { kind: DoodleKind; stroke: string }) {
  switch (kind) {
    case 'puck':
      return (
        <>
          <Circle cx={10} cy={10} r={6.2} stroke={stroke} strokeWidth={1.25} fill="none" />
          <Circle cx={10} cy={10} r={1.7} fill={stroke} />
        </>
      );
    case 'stick':
      return (
        <Path
          d="M3 17 L11 3 L15 1.5 L18 5 L14 8 L7 18"
          stroke={stroke}
          strokeWidth={1.3}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    case 'star':
      return (
        <Path
          d="M10 1.5 L12 7.5 L18.5 7.8 L13.4 11.6 L15.2 17.8 L10 14.4 L4.8 17.8 L6.6 11.6 L1.5 7.8 L8 7.5 Z"
          stroke={stroke}
          strokeWidth={1.1}
          fill="none"
          strokeLinejoin="round"
        />
      );
    case 'skate':
      return (
        <>
          <Path
            d="M2 9 C5 5, 11 4.5, 16 7 L19 11 L17 14 H3.5 Z"
            stroke={stroke}
            strokeWidth={1.15}
            fill="none"
            strokeLinejoin="round"
          />
          <Line x1={3} y1={15.2} x2={17.5} y2={15.2} stroke={stroke} strokeWidth={1.2} strokeLinecap="round" />
        </>
      );
    case 'flake':
      return (
        <>
          <Line x1={10} y1={2} x2={10} y2={18} stroke={stroke} strokeWidth={1.1} strokeLinecap="round" />
          <Line x1={2} y1={10} x2={18} y2={10} stroke={stroke} strokeWidth={1.1} strokeLinecap="round" />
          <Line x1={4} y1={4} x2={16} y2={16} stroke={stroke} strokeWidth={1.1} strokeLinecap="round" />
          <Line x1={16} y1={4} x2={4} y2={16} stroke={stroke} strokeWidth={1.1} strokeLinecap="round" />
        </>
      );
    case 'whistle':
      return (
        <>
          <Circle cx={8} cy={10} r={4.6} stroke={stroke} strokeWidth={1.15} fill="none" />
          <Circle cx={8} cy={10} r={1.3} fill={stroke} />
          <Path
            d="M12.2 8 L18 5.5 L19.2 7.4 L13.4 10"
            stroke={stroke}
            strokeWidth={1.15}
            fill="none"
            strokeLinejoin="round"
          />
        </>
      );
    case 'net':
      return (
        <>
          <Rect x={2} y={4} width={16} height={12} rx={1.2} stroke={stroke} strokeWidth={1.1} fill="none" />
          <Line x1={2} y1={4} x2={18} y2={16} stroke={stroke} strokeWidth={0.85} />
          <Line x1={18} y1={4} x2={2} y2={16} stroke={stroke} strokeWidth={0.85} />
        </>
      );
    case 'helmet':
      return (
        <>
          <Path
            d="M3 13 C3 7, 6 3.5, 10 3.5 C14 3.5, 17 7, 17 13 L3 13 Z"
            stroke={stroke}
            strokeWidth={1.15}
            fill="none"
            strokeLinejoin="round"
          />
          <Line x1={2.5} y1={13} x2={17.5} y2={13} stroke={stroke} strokeWidth={1.2} strokeLinecap="round" />
        </>
      );
    default:
      return null;
  }
}

type Cell = {
  key: string;
  x: number;
  y: number;
  kind: DoodleKind;
  rot: number;
  scale: number;
};

const HockeyPattern = React.memo(function HockeyPattern({ opacity = 0.048 }: { opacity?: number }) {
  const { width, height } = useWindowDimensions();
  const isFocused = useIsFocused();

  const cells = useMemo(() => {
    const w = Math.max(width, 320);
    const h = Math.max(height, 568);
    const cols = Math.ceil(w / CELL) + 1;
    const rows = Math.ceil(h / CELL) + 1;
    const out: Cell[] = [];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const h1 = hash2(r + 1, c + 3);
        const h2 = hash2(c + 7, r + 11);
        const h3 = hash2(r * 3 + 2, c * 5 + 1);

        // ~22% ячеек пропускаем — рвём сетку
        if (h1 < 0.22) continue;

        const rowOffset = r % 2 ? CELL * (0.28 + h2 * 0.2) : h3 * 10 - 5;
        const kind = KINDS[Math.floor(hash2(r + 19, c + 23) * KINDS.length) % KINDS.length];
        const rot = hash2(r + 41, c + 17) * 72 - 36;
        const scale = 0.78 + hash2(c + 29, r + 31) * 0.45;
        const jitterX = (hash2(r + 53, c + 59) - 0.5) * CELL * 0.55;
        const jitterY = (hash2(c + 61, r + 67) - 0.5) * CELL * 0.55;

        out.push({
          key: `${r}-${c}`,
          x: c * CELL + rowOffset + jitterX - 8,
          y: r * CELL + jitterY - 6,
          kind,
          rot,
          scale,
        });
      }
    }
    return out;
  }, [width, height]);

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
      shouldRasterizeIOS
      renderToHardwareTextureAndroid
      collapsable={false}
    >
      <Svg width={w} height={h}>
        {cells.map((cell) => (
          <G
            key={cell.key}
            transform={`translate(${cell.x} ${cell.y}) rotate(${cell.rot} 10 10) scale(${cell.scale})`}
          >
            <Doodle kind={cell.kind} stroke={stroke} />
          </G>
        ))}
      </Svg>
    </View>
  );
});

export default HockeyPattern;
