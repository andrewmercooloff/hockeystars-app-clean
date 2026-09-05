import React, { useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect } from 'react-native-svg';

/**
 * Фон «как в Telegram / WhatsApp»:
 * плотная сетка мелких контурных doodles, низкая прозрачность,
 * без крупных «детских» icon-font глифов.
 */
/** Шаг сетки как у chat wallpaper: плотно, без «дыр». */
const CELL = 34;
const PAD = 1;

type DoodleKind =
  | 'puck'
  | 'stick'
  | 'star'
  | 'skate'
  | 'whistle'
  | 'net'
  | 'helmet'
  | 'flake'
  | 'jersey'
  | 'timer';

const KINDS: DoodleKind[] = [
  'puck',
  'stick',
  'star',
  'skate',
  'whistle',
  'net',
  'helmet',
  'flake',
  'jersey',
  'timer',
  'puck',
  'stick',
  'star',
  'skate',
];

function Doodle({ kind, stroke }: { kind: DoodleKind; stroke: string }) {
  switch (kind) {
    case 'puck':
      return (
        <>
          <Circle cx={10} cy={10} r={5.2} stroke={stroke} strokeWidth={1.15} fill="none" />
          <Circle cx={10} cy={10} r={1.6} fill={stroke} />
        </>
      );
    case 'stick':
      return (
        <Path
          d="M3.5 16.5 L9 5.5 L12.5 4.2 L14.5 6.2 L11.8 8.2 L7.2 17.2"
          stroke={stroke}
          strokeWidth={1.2}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    case 'star':
      return (
        <Path
          d="M10 2.4 L11.6 7.2 L16.6 7.4 L12.7 10.5 L14.1 15.4 L10 12.8 L5.9 15.4 L7.3 10.5 L3.4 7.4 L8.4 7.2 Z"
          stroke={stroke}
          strokeWidth={1.05}
          fill="none"
          strokeLinejoin="round"
        />
      );
    case 'skate':
      return (
        <>
          <Path
            d="M4 9.5 C6 6.5, 10 6, 13 7.5 L15.5 10.5 L14 13 H5.5 Z"
            stroke={stroke}
            strokeWidth={1.1}
            fill="none"
            strokeLinejoin="round"
          />
          <Line x1={5} y1={14.2} x2={14.2} y2={14.2} stroke={stroke} strokeWidth={1.15} strokeLinecap="round" />
          <Line x1={6.2} y1={14.2} x2={6.2} y2={16.2} stroke={stroke} strokeWidth={1.05} strokeLinecap="round" />
          <Line x1={13} y1={14.2} x2={13} y2={16.2} stroke={stroke} strokeWidth={1.05} strokeLinecap="round" />
        </>
      );
    case 'whistle':
      return (
        <>
          <Circle cx={8.2} cy={10.5} r={4.1} stroke={stroke} strokeWidth={1.1} fill="none" />
          <Circle cx={8.2} cy={10.5} r={1.3} fill={stroke} />
          <Path
            d="M11.8 8.8 L16.4 6.6 L17.2 8.1 L12.6 10.2"
            stroke={stroke}
            strokeWidth={1.1}
            fill="none"
            strokeLinejoin="round"
          />
        </>
      );
    case 'net':
      return (
        <>
          <Rect x={3.5} y={4.5} width={13} height={11} rx={1.2} stroke={stroke} strokeWidth={1.1} fill="none" />
          <Line x1={3.5} y1={4.5} x2={16.5} y2={15.5} stroke={stroke} strokeWidth={0.9} />
          <Line x1={16.5} y1={4.5} x2={3.5} y2={15.5} stroke={stroke} strokeWidth={0.9} />
          <Line x1={10} y1={4.5} x2={10} y2={15.5} stroke={stroke} strokeWidth={0.8} />
        </>
      );
    case 'helmet':
      return (
        <>
          <Path
            d="M4.5 12.5 C4.5 7.2, 7.2 4.2, 10 4.2 C12.8 4.2, 15.5 7.2, 15.5 12.5 L4.5 12.5 Z"
            stroke={stroke}
            strokeWidth={1.1}
            fill="none"
            strokeLinejoin="round"
          />
          <Line x1={4.2} y1={12.5} x2={15.8} y2={12.5} stroke={stroke} strokeWidth={1.2} strokeLinecap="round" />
          <Path d="M6.2 12.5 L7.4 15.2 H12.6 L13.8 12.5" stroke={stroke} strokeWidth={1.05} fill="none" />
        </>
      );
    case 'flake':
      return (
        <>
          <Line x1={10} y1={3.2} x2={10} y2={16.8} stroke={stroke} strokeWidth={1.05} strokeLinecap="round" />
          <Line x1={3.2} y1={10} x2={16.8} y2={10} stroke={stroke} strokeWidth={1.05} strokeLinecap="round" />
          <Line x1={5.2} y1={5.2} x2={14.8} y2={14.8} stroke={stroke} strokeWidth={1.05} strokeLinecap="round" />
          <Line x1={14.8} y1={5.2} x2={5.2} y2={14.8} stroke={stroke} strokeWidth={1.05} strokeLinecap="round" />
        </>
      );
    case 'jersey':
      return (
        <Path
          d="M6.2 5.2 L8.2 4.2 L10 6.2 L11.8 4.2 L13.8 5.2 L15.2 7.5 L13.6 8.2 L13.6 16.2 H6.4 L6.4 8.2 L4.8 7.5 Z"
          stroke={stroke}
          strokeWidth={1.1}
          fill="none"
          strokeLinejoin="round"
        />
      );
    case 'timer':
      return (
        <>
          <Circle cx={10} cy={11} r={5.4} stroke={stroke} strokeWidth={1.1} fill="none" />
          <Line x1={10} y1={11} x2={10} y2={7.6} stroke={stroke} strokeWidth={1.15} strokeLinecap="round" />
          <Line x1={10} y1={11} x2={13} y2={12.4} stroke={stroke} strokeWidth={1.05} strokeLinecap="round" />
          <Line x1={8.2} y1={3.8} x2={11.8} y2={3.8} stroke={stroke} strokeWidth={1.15} strokeLinecap="round" />
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

const HockeyPattern = React.memo(function HockeyPattern({ opacity = 0.05 }: { opacity?: number }) {
  const { width, height } = useWindowDimensions();

  const cells = useMemo(() => {
    const w = Math.max(width, 320);
    const h = Math.max(height, 568);
    const cols = Math.ceil(w / CELL) + PAD;
    const rows = Math.ceil(h / CELL) + PAD;
    const out: Cell[] = [];

    for (let r = 0; r < rows; r++) {
      const rowOffset = r % 2 ? CELL * 0.48 : 0;
      for (let c = 0; c < cols; c++) {
        // Детерминированный «рандом» — живее ровной сетки, стабилен между рендерами.
        const n = (r * 47 + c * 31) % 97;
        const kind = KINDS[(r * 3 + c * 5 + (n % 3)) % KINDS.length];
        const jitterX = ((n % 7) - 3) * 0.85;
        const jitterY = (((n * 3) % 7) - 3) * 0.85;
        const rot = ((n * 17) % 72) - 36;
        const scale = 0.72 + ((n % 5) * 0.045);

        out.push({
          key: `${r}-${c}`,
          x: c * CELL + rowOffset - CELL * 0.3 + jitterX,
          y: r * CELL - CELL * 0.15 + jitterY,
          kind,
          rot,
          scale,
        });
      }
    }
    return out;
  }, [width, height]);

  // Светлый контур как у TG/WA wallpaper — не яркий brand-red.
  const stroke = 'rgba(255,255,255,0.9)';

  return (
    <View style={[StyleSheet.absoluteFill, { opacity }]} pointerEvents="none">
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
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
